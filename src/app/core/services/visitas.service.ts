import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Firestore, collection, collectionData, doc,
  setDoc, updateDoc, query, where, orderBy,
  Timestamp, deleteDoc, getDocs, writeBatch
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Visita, EstadoVisita } from '../models/visita.model';

@Injectable({ providedIn: 'root' })
export class VisitasService {
  private fs = inject(Firestore);

  // ── Crear visitas del mes si no existen ───────────────────────────────────
  async crearVisitasMes(
    sitios: { id: string; nombre: string }[],
    tipo: 'poliza' | 'cedis',
    anio: number,
    mes: number
  ): Promise<void> {
    const q = query(
      collection(this.fs, 'visitas'),
      where('tipo', '==', tipo),
      where('anio', '==', anio),
      where('mes',  '==', mes),
    );
    const snap      = await getDocs(q);
    const existentes = new Set(snap.docs.map(d => d.id));

    const batch     = writeBatch(this.fs);
    let   hayCambios = false;

    for (const s of sitios) {
      const id = `${tipo}_${anio}_${mes}_${s.id}`;
      if (existentes.has(id)) continue;

      const docRef = doc(this.fs, `visitas/${id}`);
      batch.set(docRef, {
        id,
        sitioId:       s.id,
        sitioNombre:   s.nombre,
        tipo,
        mes,
        anio,
        tecnicoId:     '',
        tecnicoNombre: '',
        estado:        'pendiente',
        horaSalida:    null,
        horaLlegada:   null,
        horaTermino:   null,
        creadoEn:      Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      });
      hayCambios = true;
    }

    if (hayCambios) await batch.commit();
  }

  // ── Observable de visitas del mes ─────────────────────────────────────────
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
      orderBy('sitioNombre'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Visita[]>;
  }

  // ── Cambios de estado ─────────────────────────────────────────────────────
  async marcarEnCamino(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:        'en_camino',
      horaSalida:    Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  }

  async marcarEnSitio(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:        'en_sitio',
      horaLlegada:   Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  }

  async marcarRealizado(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:        'en_proceso',
      actualizadoEn: Timestamp.now(),
    });
  }

  async regresarPendiente(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:        'pendiente',
      horaSalida:    null,
      horaLlegada:   null,
      horaTermino:   null,
      actualizadoEn: Timestamp.now(),
    });
  }

  async reabrirObservaciones(visitaId: string): Promise<void> {
    await this.borrarDocumentacion(visitaId);
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:            'en_proceso',
      fechaObsGuardadas: null,
      fechaDocGuardada:  null,
      fechaCompleto:     null,
      actualizadoEn:     Timestamp.now(),
    });
    try {
      await deleteDoc(doc(this.fs, `observaciones/${visitaId}`));
    } catch {}
  }

  async reabrirDocumentacion(visitaId: string): Promise<void> {
    await this.borrarDocumentacion(visitaId);
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:           'obs_guardadas',
      fechaDocGuardada: null,
      fechaCompleto:    null,
      actualizadoEn:    Timestamp.now(),
    });
  }

  async eliminarVisita(visitaId: string): Promise<void> {
  try {
    await deleteDoc(doc(this.fs, `visitas/${visitaId}`));
  } catch {}
  }

  async actualizarEstado(visitaId: string, estado: EstadoVisita): Promise<void> {
  await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
    estado,
    actualizadoEn: Timestamp.now(),
  });
  }

  // ── Borrar documentación ──────────────────────────────────────────────────
  private async borrarDocumentacion(visitaId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fs, `documentacion/${visitaId}`));
    } catch {}
  }
}