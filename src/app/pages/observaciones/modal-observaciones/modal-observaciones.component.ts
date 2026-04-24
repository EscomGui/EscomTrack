import {
  Component, inject, Input, Output,
  EventEmitter, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore, collection, getDocs, query, where
} from '@angular/fire/firestore';
import { ObservacionesService } from '../../../core/services/observaciones.service';
import { VisitasService } from '../../../core/services/visitas.service';
import { AuthService } from '../../../core/services/auth.service';
import { DialogService } from '../../../core/services/dialog.service';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import {
  ObservacionesGuardadas, Observacion, Prioridad
} from '../../../core/models/observacion.model';
import { Visita } from '../../../core/models/visita.model';

interface ObsLocal {
  descripcion: string;
  prioridad:   Prioridad | '';
  nota:        string;
  errorPri:    boolean;
  errorNota:   boolean;
  notaActiva:  boolean;
}

interface TecnicoOpcion {
  uid:    string;
  nombre: string;
}

@Component({
  selector: 'app-modal-observaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent],
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

          <!-- ── BLOQUEADO ─────────────────────────────── -->
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
                  <div style="display:flex;align-items:flex-start;gap:8px;flex:1">
                    <span class="obs-bl-num">{{ obs.numero }}</span>
                    <div style="flex:1">
                      <span class="obs-bl-txt">{{ obs.descripcion }}</span>
                      @if (obs.nota) {
                        <div class="obs-nota-bloqueada">
                          📝 {{ obs.nota }}
                        </div>
                      }
                    </div>
                  </div>
                  <span class="chip" [class]="'chip-' + obs.prioridad">
                    {{ labelPri(obs.prioridad) }}
                  </span>
                </div>
              }
            }

            @if (esAdmin && !esSuperAdmin) {
              <div class="banner banner-warn mt-3">
                <span>⚠</span>
                Si reabres las observaciones, la documentación
                se borrará automáticamente.
              </div>
            }
            @if (esSuperAdmin) {
              <div class="banner banner-info mt-3">
                <span>⭐</span>
                Como Super Admin puedes reabrir sin perder información.
              </div>
            }

          }

          <!-- ── EDITABLE ───────────────────────────────── -->
          @if (!bloqueado()) {

            <div class="section-label">Información</div>
            <div class="form-row">
              <div class="form-group">
                <label>Técnico Responsable</label>
                @if (cargandoTecnicos()) {
                  <div style="display:flex;align-items:center;gap:8px;padding:8px 0">
                    <span class="spinner"></span>
                    <span class="text-muted">Cargando técnicos...</span>
                  </div>
                } @else {
                  <select [(ngModel)]="tecnicoSeleccionado"
                          (change)="onTecnicoChange()">
                    <option value="">— Selecciona técnico —</option>
                    @for (t of tecnicos(); track t.uid) {
                      <option [value]="t.uid">{{ t.nombre }}</option>
                    }
                  </select>
                }
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

                  <!-- Campo nota opcional -->
                  <div class="nota-section">
                    @if (!obs.notaActiva) {
                      <button class="nota-toggle-btn"
                              (click)="activarNota(i)">
                        + Agregar nota (opcional)
                      </button>
                    } @else {
                      <div class="nota-wrap">
                        <label class="nota-label">
                          📝 Nota adicional
                          <span class="nota-hint">
                            (mínimo 10 palabras si se escribe)
                          </span>
                        </label>
                        <textarea
                          [(ngModel)]="obs.nota"
                          (input)="onNotaInput(i)"
                          placeholder="Describe con detalle la situación detectada..."
                          rows="2"
                          class="nota-textarea">
                        </textarea>
                        @if (obs.errorNota) {
                          <div class="form-error">
                            La nota debe tener al menos 10 palabras.
                          </div>
                        }
                        <button class="nota-quitar-btn"
                                (click)="quitarNota(i)">
                          × Quitar nota
                        </button>
                      </div>
                    }
                  </div>

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

    <app-dialog />
  `,
  styles: [`
    .mb-3             { margin-bottom: 12px; }
    .nota-section     { margin-top: 8px; }
    .nota-toggle-btn  {
      background: transparent;
      border: 1px dashed var(--gris-border);
      border-radius: var(--radius-sm);
      color: var(--azul-clar);
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      padding: 4px 10px;
      cursor: pointer;
      transition: all var(--trans);
      &:hover {
        background: var(--azul-bg);
        border-color: var(--azul-clar);
      }
    }
    .nota-wrap        { display: flex; flex-direction: column; gap: 4px; }
    .nota-label       {
      font-size: 11px; font-weight: 600;
      color: var(--gris-med); text-transform: uppercase;
      letter-spacing: .05em;
    }
    .nota-hint        {
      font-weight: 400; text-transform: none;
      font-size: 10px; color: var(--gris-med);
    }
    .nota-textarea    {
      border-color: var(--azul-clar) !important;
      background: var(--azul-bg) !important;
      font-size: 13px !important;
    }
    .nota-quitar-btn  {
      background: transparent; border: none;
      color: var(--gris-med); font-size: 11px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer; padding: 0; text-align: left;
      &:hover { color: #DC2626; }
    }
    .obs-nota-bloqueada {
      margin-top: 6px;
      padding: 6px 10px;
      background: var(--azul-bg);
      border-radius: var(--radius-sm);
      border-left: 2px solid var(--azul-clar);
      font-size: 12px;
      color: var(--gris-med);
    }
  `],
})
export class ModalObservacionesComponent implements OnInit {
  @Input()  visita!: Visita;
  @Output() cerrar    = new EventEmitter<void>();
  @Output() guardado  = new EventEmitter<void>();
  @Output() reabierto = new EventEmitter<void>();

  private fs         = inject(Firestore);
  private obsSvc     = inject(ObservacionesService);
  private visitasSvc = inject(VisitasService);
  private auth       = inject(AuthService);
  private dialog     = inject(DialogService);

  guardadas        = signal<ObservacionesGuardadas | null>(null);
  bloqueado        = signal(false);
  guardando        = signal(false);
  errorGlobal      = signal('');
  cargandoTecnicos = signal(true);
  tecnicos         = signal<TecnicoOpcion[]>([]);
  obsList          = signal<ObsLocal[]>([
    { descripcion: '', prioridad: '', nota: '',
      errorPri: false, errorNota: false, notaActiva: false }
  ]);

  sinObservaciones    = false;
  tecnicoSeleccionado = '';
  tecnicoNombre       = '';
  fecha               = new Date().toISOString().split('T')[0];

  get esAdmin():      boolean { return this.auth.esAdmin; }
  get esSuperAdmin(): boolean { return this.auth.esSuperAdmin; }

  async ngOnInit(): Promise<void> {
    await this.cargarTecnicos();

    const usuarioActual = this.auth.usuarioActual();
    if (usuarioActual) {
      this.tecnicoSeleccionado = usuarioActual.uid;
      this.tecnicoNombre       = usuarioActual.nombre;
    }

    const obs = await this.obsSvc.getObservaciones(this.visita.id!);
    if (obs) {
      this.guardadas.set(obs);
      this.bloqueado.set(obs.bloqueada);
      if (!obs.bloqueada) this.cargarEnFormulario(obs);
    }
  }

  private async cargarTecnicos(): Promise<void> {
    try {
      const q    = query(
        collection(this.fs, 'usuarios'),
        where('activo', '==', true)
      );
      const snap = await getDocs(q);
      const lista: TecnicoOpcion[] = snap.docs.map(d => ({
        uid:    d.id,
        nombre: (d.data() as any).nombre,
      }));
      this.tecnicos.set(lista);
    } catch (e) {
      console.error('Error cargando técnicos:', e);
    } finally {
      this.cargandoTecnicos.set(false);
    }
  }

  onTecnicoChange(): void {
    const t = this.tecnicos().find(x => x.uid === this.tecnicoSeleccionado);
    this.tecnicoNombre = t?.nombre ?? '';
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

  onNotaInput(i: number): void {
    const l = [...this.obsList()];
    l[i].errorNota = false;
    this.obsList.set(l);
  }

  setPri(i: number, p: Prioridad): void {
    const l = [...this.obsList()];
    l[i].prioridad = p;
    l[i].errorPri  = false;
    this.obsList.set(l);
  }

  agregar(): void {
    this.obsList.update(l => [
      ...l,
      { descripcion: '', prioridad: '', nota: '',
        errorPri: false, errorNota: false, notaActiva: false }
    ]);
  }

  quitar(i: number): void {
    this.obsList.update(l => l.filter((_, idx) => idx !== i));
  }

  activarNota(i: number): void {
    const l = [...this.obsList()];
    l[i].notaActiva = true;
    this.obsList.set(l);
  }

  quitarNota(i: number): void {
    const l = [...this.obsList()];
    l[i].nota       = '';
    l[i].notaActiva = false;
    l[i].errorNota  = false;
    this.obsList.set(l);
  }

  private contarPalabras(texto: string): number {
    return texto.trim().split(/\s+/).filter(p => p.length > 0).length;
  }

  private cargarEnFormulario(obs: ObservacionesGuardadas): void {
    const t = this.tecnicos().find(x => x.nombre === obs.tecnicoNombre);
    if (t) this.tecnicoSeleccionado = t.uid;
    this.tecnicoNombre    = obs.tecnicoNombre;
    this.sinObservaciones = obs.sinObservaciones;
    if (!obs.sinObservaciones && obs.observaciones.length) {
      this.obsList.set(obs.observaciones.map(o => ({
        descripcion: o.descripcion,
        prioridad:   o.prioridad,
        nota:        o.nota ?? '',
        errorPri:    false,
        errorNota:   false,
        notaActiva:  !!(o.nota && o.nota.trim()),
      })));
    }
  }

  async onGuardar(): Promise<void> {
    if (!this.tecnicoSeleccionado) {
      this.errorGlobal.set('Selecciona el técnico responsable.');
      return;
    }

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

      let obsError = { ...obs };

      // Validar prioridad
      if (!obs.prioridad) {
        hayError = true;
        obsError = { ...obsError, errorPri: true };
      }

      // Validar nota si está activa y tiene texto
      if (obs.notaActiva && obs.nota.trim()) {
        const palabras = this.contarPalabras(obs.nota);
        if (palabras < 10) {
          hayError = true;
          obsError = { ...obsError, errorNota: true };
        }
      }

      if (!obsError.errorPri && !obsError.errorNota) {
        validas.push(obs);
      }

      return obsError;
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
      ...(o.notaActiva && o.nota.trim()
        ? { nota: o.nota.trim() }
        : {}),
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
        tecnicoId:        this.tecnicoSeleccionado,
        tecnicoNombre:    this.tecnicoNombre,
      });
      await this.visitasSvc.actualizarTecnico(
        this.visita.id!,
        this.tecnicoSeleccionado,
        this.tecnicoNombre
      );
      this.guardado.emit();
    } finally {
      this.guardando.set(false);
    }
  }

  async onReabrir(): Promise<void> {
    const esSA = this.esSuperAdmin;
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '🔓',
      titulo:    'Reabrir observaciones',
      mensaje:   '¿Confirmas reabrir las observaciones?',
      detalle:   esSA
        ? 'Las observaciones se conservarán. Solo cambia el estado.'
        : 'La documentación de este sitio se borrará automáticamente.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.visitasSvc.reabrirObservaciones(this.visita.id!, esSA);
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