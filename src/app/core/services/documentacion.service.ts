import { Injectable, inject } from '@angular/core';
import {
  Firestore, doc, setDoc, getDoc,
  updateDoc, Timestamp, deleteDoc
} from '@angular/fire/firestore';
import {
  Documentacion,
  buildItemsFromTemplate
} from '../models/documentacion.model';
import { AuthService } from './auth.service';
import { VisitasService } from './visitas.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class DocumentacionService {
  private fs      = inject(Firestore);
  private auth    = inject(AuthService);
  private visitas = inject(VisitasService);
  private storage = inject(StorageService);

  async getDocumentacion(
    visitaId: string
  ): Promise<Documentacion | null> {
    const snap = await getDoc(doc(this.fs, `documentacion/${visitaId}`));
    return snap.exists() ? (snap.data() as Documentacion) : null;
  }

  async inicializarDocumentacion(
    visitaId: string,
    tipo: 'poliza' | 'cedis',
    tecnicoNombre: string
  ): Promise<Documentacion> {
    const existente = await this.getDocumentacion(visitaId);
    if (existente) return existente;

    const u = this.auth.usuarioActual()!;
    const nueva: Documentacion = {
      visitaId,
      tecnicoId:     u.uid,
      tecnicoNombre,
      fecha:         new Date(),
      tipo,
      items:         buildItemsFromTemplate(tipo),
      finalizado:    false,
      creadoEn:      new Date(),
      actualizadoEn: new Date(),
    };

    await setDoc(doc(this.fs, `documentacion/${visitaId}`), {
      ...nueva,
      fecha:         Timestamp.fromDate(nueva.fecha),
      creadoEn:      Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });

    return nueva;
  }

  async guardarBorrador(
    visitaId: string,
    documentacion: Documentacion
  ): Promise<void> {
    await updateDoc(doc(this.fs, `documentacion/${visitaId}`), {
      items:         documentacion.items,
      actualizadoEn: Timestamp.now(),
    });
  }

  async finalizar(
    visitaId: string,
    documentacion: Documentacion
  ): Promise<void> {
    await updateDoc(doc(this.fs, `documentacion/${visitaId}`), {
      items:         documentacion.items,
      finalizado:    true,
      actualizadoEn: Timestamp.now(),
    });
    await this.visitas.actualizarEstado(visitaId, 'completo');
  }

  async borrarDocumentacion(visitaId: string): Promise<void> {
    const existente = await this.getDocumentacion(visitaId);
    if (existente) {
      // Borra cada foto de Cloudinary
      for (const item of existente.items) {
        for (const foto of item.fotos) {
          await this.storage.borrarFoto(foto.path);
        }
      }
    }
    try {
      await deleteDoc(doc(this.fs, `documentacion/${visitaId}`));
    } catch {}
  }
}