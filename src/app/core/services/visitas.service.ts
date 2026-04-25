import { Injectable, inject } from '@angular/core';
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
    const snap       = await getDocs(q);
    const existentes = new Set(snap.docs.map(d => d.id));
    const batch      = writeBatch(this.fs);
    let   hayCambios = false;

    for (const s of sitios) {
      const id = `${tipo}_${anio}_${mes}_${s.id}`;
      if (existentes.has(id)) continue;
      const docRef = doc(this.fs, `visitas/${id}`);
      batch.set(docRef, {
        id,
        sitioId:       s.id,
        sitioNombre:   s.nombre,
        tipo, mes, anio,
        tecnicoId:     '',
        tecnicoNombre: '',
        estado:        'pendiente',
        horaSalida:    null,
        horaLlegada:   null,
        horaInicio:    null,
        horaTermino:   null,
        esCompletadoDirecto: false,
        creadoEn:      Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      });
      hayCambios = true;
    }
    if (hayCambios) await batch.commit();
  }

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
      horaInicio:    Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  }

  async marcarTermino(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      horaTermino:   Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  }

  async actualizarEstado(
    visitaId: string,
    estado: EstadoVisita
  ): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado,
      actualizadoEn: Timestamp.now(),
    });
  }

  async actualizarTecnico(
    visitaId: string,
    tecnicoId: string,
    tecnicoNombre: string
  ): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      tecnicoId,
      tecnicoNombre,
      actualizadoEn: Timestamp.now(),
    });
  }

  // ── Super Admin — marcar completo directo sin flujo ───────────────────────
  async marcarCompletoDirecto(
    visitaId: string,
    tecnicoNombre: string
  ): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:              'completo',
      tecnicoId:           '',
      tecnicoNombre,
      esCompletadoDirecto: true,
      actualizadoEn:       Timestamp.now(),
    });
  }

  // ── Regresar a estado específico ──────────────────────────────────────────
  async regresarAEstado(
    visitaId: string,
    estado: EstadoVisita,
    esSuperAdmin: boolean = false
  ): Promise<void> {
    const cambios: any = {
      estado,
      actualizadoEn: Timestamp.now(),
    };

    if (estado === 'pendiente') {
      cambios.tecnicoId            = '';
      cambios.tecnicoNombre        = '';
      cambios.horaSalida           = null;
      cambios.horaLlegada          = null;
      cambios.horaInicio           = null;
      cambios.horaTermino          = null;
      cambios.esCompletadoDirecto  = false;
    }

    if (!esSuperAdmin) {
      // Admin — hard delete según estado destino
      if (['pendiente','en_camino','en_sitio','en_proceso'].includes(estado)) {
        await this.borrarDocumentacion(visitaId);
        try { await deleteDoc(doc(this.fs, `observaciones/${visitaId}`)); } catch {}
      }
      if (estado === 'obs_guardadas') {
        await this.borrarDocumentacion(visitaId);
      }
    }
    // SuperAdmin — solo cambia estado, conserva todo

    await updateDoc(doc(this.fs, `visitas/${visitaId}`), cambios);
  }

  // ── Reabrir ───────────────────────────────────────────────────────────────
  async reabrirObservaciones(
    visitaId: string,
    conservar: boolean = false
  ): Promise<void> {
    if (!conservar) {
      await this.borrarDocumentacion(visitaId);
      try { await deleteDoc(doc(this.fs, `observaciones/${visitaId}`)); } catch {}
    }
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:              'en_proceso',
      esCompletadoDirecto: false,
      actualizadoEn:       Timestamp.now(),
    });
  }

    async cambiarEstadoDirecto(
    visitaId:             string,
    estado:               EstadoVisita,
    tecnicoNombre:        string,
    esCompletadoDirecto:  boolean = false
  ): Promise<void> {
    const cambios: any = {
      estado,
      tecnicoNombre,
      esCompletadoDirecto,
      actualizadoEn: Timestamp.now(),
    };

    // Si regresa a pendiente — limpiar horarios y técnico
    if (estado === 'pendiente') {
      cambios.tecnicoNombre       = '';
      cambios.tecnicoId           = '';
      cambios.horaSalida          = null;
      cambios.horaLlegada         = null;
      cambios.horaInicio          = null;
      cambios.horaTermino         = null;
      cambios.esCompletadoDirecto = false;
    }

    await updateDoc(doc(this.fs, `visitas/${visitaId}`), cambios);
  }

  async reabrirDocumentacion(
    visitaId: string,
    conservar: boolean = false
  ): Promise<void> {
    if (!conservar) {
      await this.borrarDocumentacion(visitaId);
    }
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:              'obs_guardadas',
      esCompletadoDirecto: false,
      actualizadoEn:       Timestamp.now(),
    });
  }

  async regresarPendiente(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `visitas/${visitaId}`), {
      estado:              'pendiente',
      tecnicoId:           '',
      tecnicoNombre:       '',
      horaSalida:          null,
      horaLlegada:         null,
      horaInicio:          null,
      horaTermino:         null,
      esCompletadoDirecto: false,
      actualizadoEn:       Timestamp.now(),
    });
  }

  async eliminarVisita(visitaId: string): Promise<void> {
    try { await deleteDoc(doc(this.fs, `visitas/${visitaId}`)); } catch {}
  }

  private async borrarDocumentacion(visitaId: string): Promise<void> {
    try { await deleteDoc(doc(this.fs, `documentacion/${visitaId}`)); } catch {}
  }
}