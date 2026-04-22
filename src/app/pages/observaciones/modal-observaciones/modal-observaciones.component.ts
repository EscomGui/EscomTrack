import { Component, inject, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObservacionesService } from '../../../core/services/observaciones.service';
import { VisitasService } from '../../../core/services/visitas.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ObservacionesGuardadas,
  Observacion,
  Prioridad
} from '../../../core/models/observacion.model';
import { Visita } from '../../../core/models/visita.model';

interface ObsLocal {
  descripcion: string;
  prioridad:   Prioridad | '';
  errorPri:    boolean;
}

@Component({
  selector: 'app-modal-observaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <span class="modal-title">
            {{ visita.sitioNombre }} — Observaciones
          </span>
          <button class="modal-close" (click)="cerrar.emit()">×</button>
        </div>

        <div class="modal-body">

          <!-- ── BLOQUEADO ─────────────────────────────────── -->
          @if (bloqueado()) {

            <div class="banner banner-lock mb-3">
              <span>🔒</span> Observaciones guardadas — solo lectura
            </div>

            <div class="section-label">Información</div>
            <div class="form-row">
              <div class="form-group">
                <label>Técnico Responsable</label>
                <input [value]="guardadas()?.tecnicoNombre" disabled />
              </div>
              <div class="form-group">
                <label>Fecha de visita</label>
                <input [value]="fmtFecha(guardadas()?.fecha)" disabled />
              </div>
            </div>

            <div class="section-label">Observaciones</div>

            @if (guardadas()?.sinObservaciones) {
              <div class="banner banner-info">
                <span>ℹ</span> El sitio no presenta observaciones.
              </div>
            } @else {
              @for (obs of guardadas()?.observaciones; track obs.numero) {
                <div class="obs-bloqueada" [class]="obs.prioridad">
                  <span class="obs-bl-num">{{ obs.numero }}</span>
                  <span class="obs-bl-txt">{{ obs.descripcion }}</span>
                  <span class="chip" [class]="'chip-' + obs.prioridad">
                    {{ labelPri(obs.prioridad) }}
                  </span>
                </div>
              }
            }

            @if (esAdmin) {
              <div class="banner banner-warn mt-3">
                <span>⚠</span>
                Si reabres las observaciones, la documentación
                de este sitio se borrará automáticamente.
              </div>
            }

          }

          <!-- ── EDITABLE ───────────────────────────────────── -->
          @if (!bloqueado()) {

            <div class="section-label">Información</div>
            <div class="form-row">
              <div class="form-group">
                <label>Técnico Responsable</label>
                <select [(ngModel)]="tecnicoNombre">
                  <option>HERNANDEZ</option>
                  <option>Luis</option>
                  <option>Rafa</option>
                  <option>EDDI</option>
                  <option>EDUARDO</option>
                </select>
              </div>
              <div class="form-group">
                <label>Fecha de visita</label>
                <input type="date" [(ngModel)]="fecha" />
              </div>
            </div>

            <div class="section-label">Observaciones</div>

            <label class="sin-obs-check">
              <input type="checkbox"
                     [(ngModel)]="sinObservaciones"
                     (change)="onSinObs()" />
              <span>Sin observaciones — el sitio no presenta observaciones</span>
            </label>

            <div [class.disabled-block]="sinObservaciones">

              @for (obs of obsList(); track i; let i = $index) {
                <div class="obs-card"
                     [class]="obs.prioridad"
                     [class.error]="obs.errorPri">
                  <div class="obs-row">
                    <div class="form-group" style="flex:1;margin-bottom:0">
                      <textarea
                        [placeholder]="'Observación ' + (i + 1) + '...'"
                        [(ngModel)]="obs.descripcion"
                        (input)="onInput(i)"
                        rows="2">
                      </textarea>
                    </div>
                    <div class="pri-group">
                      <button class="pri-btn"
                              [class.sel-alta]="obs.prioridad === 'alta'"
                              [class.err]="obs.errorPri && !obs.prioridad"
                              (click)="setPri(i, 'alta')">Alta</button>
                      <button class="pri-btn"
                              [class.sel-media]="obs.prioridad === 'media'"
                              [class.err]="obs.errorPri && !obs.prioridad"
                              (click)="setPri(i, 'media')">Media</button>
                      <button class="pri-btn"
                              [class.sel-baja]="obs.prioridad === 'baja'"
                              [class.err]="obs.errorPri && !obs.prioridad"
                              (click)="setPri(i, 'baja')">Baja</button>
                    </div>
                    @if (obsList().length > 1) {
                      <button class="btn btn-danger btn-sm btn-icon"
                              style="flex-shrink:0;align-self:flex-start"
                              (click)="quitar(i)">×</button>
                    }
                  </div>
                  @if (obs.errorPri) {
                    <div class="form-error mt-2">
                      Selecciona una prioridad.
                    </div>
                  }
                </div>
              }

              <button class="add-obs-btn" (click)="agregar()">
                + Agregar observación
              </button>

            </div>

            @if (errorGlobal()) {
              <div class="banner banner-danger mt-3">
                <span>⚠</span> {{ errorGlobal() }}
              </div>
            }

          }

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          @if (bloqueado()) {
            @if (esAdmin) {
              <button class="btn btn-danger"
                      [disabled]="guardando()"
                      (click)="onReabrir()">
                🔓 Reabrir observaciones
              </button>
            }
            <button class="btn btn-secondary"
                    (click)="cerrar.emit()">Cerrar</button>
          } @else {
            <button class="btn btn-secondary"
                    (click)="cerrar.emit()">Cancelar</button>
            <button class="btn btn-primary"
                    [disabled]="guardando()"
                    (click)="onGuardar()">
              @if (guardando()) { <span class="spinner"></span> }
              Guardar observaciones
            </button>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`.mb-3 { margin-bottom: 12px; }`],
})
export class ModalObservacionesComponent implements OnInit {
  @Input()  visita!: Visita;
  @Output() cerrar    = new EventEmitter<void>();
  @Output() guardado  = new EventEmitter<void>();
  @Output() reabierto = new EventEmitter<void>();

  private obsSvc     = inject(ObservacionesService);
  private visitasSvc = inject(VisitasService);
  private auth       = inject(AuthService);

  guardadas   = signal<ObservacionesGuardadas | null>(null);
  bloqueado   = signal(false);
  guardando   = signal(false);
  errorGlobal = signal('');
  obsList     = signal<ObsLocal[]>([
    { descripcion: '', prioridad: '', errorPri: false }
  ]);

  sinObservaciones = false;
  tecnicoNombre    = '';
  fecha            = new Date().toISOString().split('T')[0];

  get esAdmin(): boolean { return this.auth.esAdmin; }

  async ngOnInit(): Promise<void> {
    this.tecnicoNombre = this.auth.usuarioActual()?.nombre ?? '';
    const obs = await this.obsSvc.getObservaciones(this.visita.id!);
    if (obs) {
      this.guardadas.set(obs);
      this.bloqueado.set(obs.bloqueada);
      if (!obs.bloqueada) this.cargarEnFormulario(obs);
    }
  }

  fmtFecha(f: any): string {
    if (!f) return '';
    const d = f?.toDate ? f.toDate() : new Date(f);
    return d.toLocaleDateString('es-MX');
  }

  labelPri(p: string): string {
    return { alta: 'Alta', media: 'Media', baja: 'Baja' }[p] ?? p;
  }

  onSinObs(): void {
    if (this.sinObservaciones) this.errorGlobal.set('');
  }

  onInput(i: number): void {
    const l = [...this.obsList()];
    l[i].errorPri = false;
    this.obsList.set(l);
    this.errorGlobal.set('');
  }

  setPri(i: number, p: Prioridad): void {
    const l = [...this.obsList()];
    l[i].prioridad = p;
    l[i].errorPri  = false;
    this.obsList.set(l);
  }

  agregar(): void {
    this.obsList.update(l => [
      ...l, { descripcion: '', prioridad: '', errorPri: false }
    ]);
  }

  quitar(i: number): void {
    this.obsList.update(l => l.filter((_, idx) => idx !== i));
  }

  private cargarEnFormulario(obs: ObservacionesGuardadas): void {
    this.tecnicoNombre    = obs.tecnicoNombre;
    this.sinObservaciones = obs.sinObservaciones;
    if (!obs.sinObservaciones && obs.observaciones.length) {
      this.obsList.set(obs.observaciones.map(o => ({
        descripcion: o.descripcion,
        prioridad:   o.prioridad,
        errorPri:    false,
      })));
    }
  }

  async onGuardar(): Promise<void> {
    if (this.sinObservaciones) {
      await this.guardarFinal(true, []);
      return;
    }

    const lista   = this.obsList();
    let hayError  = false;
    let hayAlguna = false;
    const validas: ObsLocal[] = [];

    const actualizada = lista.map(obs => {
      const desc = obs.descripcion.trim();
      if (!desc) return obs;
      hayAlguna = true;
      if (!obs.prioridad) {
        hayError = true;
        return { ...obs, errorPri: true };
      }
      validas.push(obs);
      return obs;
    });

    this.obsList.set(actualizada);

    if (!hayAlguna) {
      this.errorGlobal.set(
        'Agrega al menos una observación o marca "Sin observaciones".'
      );
      return;
    }
    if (hayError) return;

    const observaciones: Observacion[] = validas.map((o, idx) => ({
      visitaId:    this.visita.id!,
      numero:      idx + 1,
      descripcion: o.descripcion.trim(),
      prioridad:   o.prioridad as Prioridad,
    }));

    await this.guardarFinal(false, observaciones);
  }

  private async guardarFinal(
    sinObs: boolean,
    observaciones: Observacion[]
  ): Promise<void> {
    this.guardando.set(true);
    try {
      await this.obsSvc.guardarObservaciones(this.visita.id!, {
        fecha:            new Date(this.fecha),
        sinObservaciones: sinObs,
        observaciones,
        tecnicoId:        this.auth.usuarioActual()!.uid,
        tecnicoNombre:    this.tecnicoNombre,
      });
      this.guardado.emit();
    } finally {
      this.guardando.set(false);
    }
  }

  async onReabrir(): Promise<void> {
    const ok = confirm(
      '¿Confirmas reabrir las observaciones?\n' +
      'La documentación se borrará automáticamente.'
    );
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.visitasSvc.reabrirObservaciones(this.visita.id!);
      this.reabierto.emit();
    } finally {
      this.guardando.set(false);
    }
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop'))
      this.cerrar.emit();
  }
}