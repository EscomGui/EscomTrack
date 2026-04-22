// import { Injectable, inject } from '@angular/core';
// import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
// import { FotoItem, TipoFoto } from '../models/documentacion.model';
// import imageCompression from 'browser-image-compression';

// @Injectable({ providedIn: 'root' })
// export class StorageService {
//   private storage = inject(Storage);

//   async subirFoto(
//     visitaId: string,
//     itemId: string,
//     tipo: TipoFoto,
//     file: File
//   ): Promise<FotoItem> {
//     // 1. Detectar orientación ANTES de comprimir
//     const orientacion = await this.detectarOrientacion(file);

//     // 2. Comprimir imagen (máx 500KB, máx 1280px)
//     const comprimida = await imageCompression(file, {
//       maxSizeMB: 0.5,
//       maxWidthOrHeight: 1280,
//       useWebWorker: true,
//     });

//     // 3. Subir a Firebase
//     const ext  = file.name.split('.').pop() || 'jpg';
//     const path = `visitas/${visitaId}/${itemId}_${tipo}_${Date.now()}.${ext}`;
//     const storageRef = ref(this.storage, path);

//     await uploadBytes(storageRef, comprimida);
//     const url = await getDownloadURL(storageRef);

//     return { tipo, url, path, orientacion };
//   }

//   async borrarFoto(path: string): Promise<void> {
//     try {
//       await deleteObject(ref(this.storage, path));
//     } catch {}
//   }

//   private detectarOrientacion(file: File): Promise<'vertical' | 'horizontal'> {
//     return new Promise(resolve => {
//       const img = new Image();
//       const url = URL.createObjectURL(file);
//       img.onload = () => {
//         URL.revokeObjectURL(url);
//         resolve(
//           img.naturalHeight > img.naturalWidth ? 'vertical' : 'horizontal'
//         );
//       };
//       img.onerror = () => {
//         URL.revokeObjectURL(url);
//         resolve('horizontal');
//       };
//       img.src = url;
//     });
//   }
// }

// import { Injectable } from '@angular/core';
// import { FotoItem, TipoFoto } from '../models/documentacion.model';
// import imageCompression from 'browser-image-compression';

// @Injectable({ providedIn: 'root' })
// export class StorageService {

//   async subirFoto(
//     visitaId: string,
//     itemId: string,
//     tipo: TipoFoto,
//     file: File
//   ): Promise<FotoItem> {
//     const orientacion = await this.detectarOrientacion(file);

//     // Comprimir primero para que quepa en Firestore
//     const comprimida = await imageCompression(file, {
//       maxSizeMB: 0.2,        // máx 200KB
//       maxWidthOrHeight: 800, // máx 800px
//       useWebWorker: true,
//     });

//     const base64 = await this.fileToBase64(comprimida);

//     return {
//       tipo,
//       url:  base64,
//       path: `${visitaId}/${itemId}_${tipo}`,
//       orientacion,
//     };
//   }

//   async borrarFoto(path: string): Promise<void> {
//     // Sin Storage, no hay nada que borrar
//   }

//   private fileToBase64(file: File): Promise<string> {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload  = () => resolve(reader.result as string);
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   }

//   private detectarOrientacion(file: File): Promise<'vertical' | 'horizontal'> {
//     return new Promise(resolve => {
//       const img = new Image();
//       const url = URL.createObjectURL(file);
//       img.onload = () => {
//         URL.revokeObjectURL(url);
//         resolve(
//           img.naturalHeight > img.naturalWidth ? 'vertical' : 'horizontal'
//         );
//       };
//       img.onerror = () => {
//         URL.revokeObjectURL(url);
//         resolve('horizontal');
//       };
//       img.src = url;
//     });
//   }
// }

import { Injectable } from '@angular/core';
import { FotoItem, TipoFoto } from '../models/documentacion.model';
import { environment } from '../../../environments/environment';
import imageCompression from 'browser-image-compression';

@Injectable({ providedIn: 'root' })
export class StorageService {

  private readonly cloudName    = environment.cloudinary.cloudName;
  private readonly uploadPreset = environment.cloudinary.uploadPreset;

  async subirFoto(
    visitaId: string,
    itemId: string,
    tipo: TipoFoto,
    file: File
  ): Promise<FotoItem> {
    // 1. Detectar orientación antes de comprimir
    const orientacion = await this.detectarOrientacion(file);

    // 2. Comprimir imagen
    const comprimida = await imageCompression(file, {
      maxSizeMB:        0.5,
      maxWidthOrHeight: 1280,
      useWebWorker:     true,
    });

    // 3. Carpeta organizada por visita
    const folder   = `escom-track/${visitaId}`;
    const publicId = `${itemId}_${tipo}_${Date.now()}`;

    // 4. Subir a Cloudinary
    const formData = new FormData();
    formData.append('file',          comprimida);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder',        folder);
    formData.append('public_id',     publicId);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('Cloudinary error:', err);
      throw new Error('Error al subir imagen');
    }

    const data = await res.json();

    return {
      tipo,
      url:        data.secure_url,
      path:       data.public_id,
      orientacion,
    };
  }

  async borrarFoto(publicId: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('public_id',     publicId);
      formData.append('upload_preset', this.uploadPreset);

      await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        { method: 'POST', body: formData }
      );
    } catch (e) {
      console.error('Error al borrar foto de Cloudinary:', e);
    }
  }

  private detectarOrientacion(file: File): Promise<'vertical' | 'horizontal'> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(
          img.naturalHeight > img.naturalWidth ? 'vertical' : 'horizontal'
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('horizontal');
      };
      img.src = url;
    });
  }
}