import { Injectable, inject } from '@angular/core';
import {
  Firestore, doc, setDoc, getDoc,
  updateDoc, Timestamp, deleteDoc
} from '@angular/fire/firestore';
import { ObservacionesGuardadas } from '../models/observacion.model';
import { AuthService } from './auth.service';
import { VisitasService } from './visitas.service';

@Injectable({ providedIn: 'root' })
export class ObservacionesService {
  private fs      = inject(Firestore);
  private auth    = inject(AuthService);
  private visitas = inject(VisitasService);

  async getObservaciones(
    visitaId: string
  ): Promise<ObservacionesGuardadas | null> {
    const snap = await getDoc(doc(this.fs, `observaciones/${visitaId}`));
    return snap.exists() ? (snap.data() as ObservacionesGuardadas) : null;
  }

  async guardarObservaciones(
    visitaId: string,
    data: Omit<ObservacionesGuardadas,
      'id' | 'visitaId' | 'bloqueada' | 'creadoEn' | 'actualizadoEn'>
  ): Promise<void> {
    const u = this.auth.usuarioActual()!;
    await setDoc(doc(this.fs, `observaciones/${visitaId}`), {
      ...data,
      visitaId,
      tecnicoId:     u.uid,
      tecnicoNombre: u.nombre,
      fecha:         Timestamp.fromDate(data.fecha),
      bloqueada:     true,
      creadoEn:      Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
    await this.visitas.actualizarEstado(visitaId, 'obs_guardadas');
    await this.visitas.marcarTermino(visitaId);
  }

  async desbloquearObservaciones(visitaId: string): Promise<void> {
    await updateDoc(doc(this.fs, `observaciones/${visitaId}`), {
      bloqueada:     false,
      actualizadoEn: Timestamp.now(),
    });
  }

  async borrarObservaciones(visitaId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fs, `observaciones/${visitaId}`));
    } catch {}
  }
}