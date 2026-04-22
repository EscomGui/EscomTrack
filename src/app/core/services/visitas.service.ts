import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc,
  setDoc, updateDoc, query, where, orderBy,
  Timestamp, deleteDoc, getDoc, getDocs, writeBatch
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Visita, EstadoVisita } from '../models/visita.model';
import { AuthService } from './auth.service';



@Injectable({ providedIn: 'root' })
export class VisitasService {
  private fs   = inject(Firestore);
  private auth = inject(AuthService);

  getVisitasPorMes(
    tipo: 'poliza' | 'cedis',
    anio: number,
    mes: number
  ): Observable<Visita[]> {
    const q = query(
      collection(this.fs, 'visitas'),
      where('tipo', '==', tipo),
      where('anio', '==', anio),
      where('mes',  '==', mes),
      orderBy('sitioNombre')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Visita[]>;
  }

  async crearVisitasMes(
    sitios: { id: string; nombre: string }[],
    tipo: 'poliza' | 'cedis',
    anio: number,
    mes: number
  ): Promise<void> {
    // Primero trae todas las visitas del mes de una sola consulta
    const q = query(
      collection(this.fs, 'visitas'),
      where('tipo', '==', tipo),
      where('anio', '==', anio),
      where('mes',  '==', mes),
    );
    const snap = await getDocs(q);
    const existentes = new Set(snap.docs.map(d => d.id));

    // Solo crea los que no existen
    const batch = writeBatch(this.fs);
    let hayCambios = false;

    for (const s of sitios) {
      const id = `${tipo}_${anio}_${mes}_${s.id}`;
      if (existentes.has(id)) continue;

      const docRef = doc(this.fs, `visitas/${id}`);
      const visita: Visita = {
        id,
        sitioId:       s.id,
        sitioNombre:   s.nombre,
        tipo,
        mes,
        anio,
        tecnicoId:     '',
        tecnicoNombre: '',
        estado:        'pendiente',
        creadoEn:      new Date(),
        actualizadoEn: new Date(),
      };
      batch.set(docRef, this.toFirestore(visita));
      hayCambios = true;
    }

    if (hayCambios) await batch.commit();
  }

  async marcarRealizado(visitaId: string): Promise<void> {
    const u = this.auth.usuarioActual()!;
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:           'en_proceso',
      tecnicoId:        u.uid,
      tecnicoNombre:    u.nombre,
      fechaRealizado:   Timestamp.now(),
      actualizadoEn:    Timestamp.now(),
    });
  }

  async actualizarEstado(
    visitaId: string,
    estado: EstadoVisita
  ): Promise<void> {
    const updates: any = { estado, actualizadoEn: Timestamp.now() };
    if (estado === 'obs_guardadas') updates.fechaObsGuardadas = Timestamp.now();
    if (estado === 'completo')      updates.fechaCompleto     = Timestamp.now();
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), updates);
  }

  // Admin — reabrir observaciones (borra documentación en cascada)
  async reabrirObservaciones(visitaId: string): Promise<void> {
    // 1. Borra documentación
    await this.borrarDocumentacion(visitaId);

    // 2. Cambia estado de la visita a en_proceso
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:            'en_proceso',
      fechaObsGuardadas: null,
      fechaDocGuardada:  null,
      fechaCompleto:     null,
      actualizadoEn:     Timestamp.now(),
    });

    // 3. Borra el documento de observaciones para que empiece limpio
    try {
      await deleteDoc(doc(this.fs, `observaciones/${visitaId}`));
    } catch {}
  }

  async reabrirDocumentacion(visitaId: string): Promise<void> {
    // Solo borra documentación, observaciones se quedan intactas
    await this.borrarDocumentacion(visitaId);

    // Regresa estado a obs_guardadas
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:           'obs_guardadas',
      fechaDocGuardada: null,
      fechaCompleto:    null,
      actualizadoEn:    Timestamp.now(),
    });
  }

  private async borrarDocumentacion(visitaId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fs, `documentacion/${visitaId}`));
    } catch {}
  }

  private toFirestore(v: Visita): any {
    return {
      ...v,
      creadoEn:      Timestamp.fromDate(v.creadoEn!),
      actualizadoEn: Timestamp.fromDate(v.actualizadoEn!),
    };
  }
}