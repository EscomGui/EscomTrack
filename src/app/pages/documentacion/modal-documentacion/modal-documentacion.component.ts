import {
  Component, inject, Input, Output,
  EventEmitter, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentacionService } from '../../../core/services/documentacion.service';
import { ObservacionesService } from '../../../core/services/observaciones.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { VisitasService } from '../../../core/services/visitas.service';
import {
  Documentacion,
  ItemChecklist,
  SeccionDoc,
  FotoItem,
  TipoFoto
} from '../../../core/models/documentacion.model';
import { Observacion } from '../../../core/models/observacion.model';
import { Visita } from '../../../core/models/visita.model';

@Component({
  selector: 'app-modal-documentacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <div class="modal-box modal-doc-box" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <span class="modal-title">
            {{ visita.sitioNombre }} — Documentación
          </span>
          <button class="modal-close" (click)="cerrar.emit()">×</button>
        </div>

        <div class="modal-body">

          @if (cargando()) {
            <div style="display:flex;justify-content:center;padding:48px">
              <span class="spinner"></span>
            </div>
          } @else if (doc()) {

            <!-- Banners -->
            @if (bloqueado && !esAdmin) {
              <div class="banner banner-lock mb-3">
                <span>🔒</span>
                Documentación finalizada — solo lectura.
                No se puede modificar nada.
              </div>
            }
            @if (bloqueado && esAdmin) {
              <div class="banner banner-lock mb-3">
                <span>🔒</span>
                Documentación finalizada — solo lectura.
              </div>
              <div class="banner banner-warn mb-3">
                <span>⚠</span>
                Si reabres la documentación, tendrán que
                volver a llenarla desde cero.
              </div>
            }
            @if (!bloqueado) {
              <div class="banner banner-info mb-3">
                <span>ℹ</span>
                Todos los campos son obligatorios. Sube una foto
                o marca "Sin fotos" en cada ítem antes de finalizar.
              </div>
            }

            <!-- Contenido con overlay -->
            <div class="contenido-doc">

              @if (bloqueado) {
                <div class="bloqueo-overlay"></div>
              }

              <!-- Info -->
              <div class="section-label">Información</div>
              <div class="form-row" style="margin-bottom:16px">
                <div class="form-group">
                  <label>Técnico Responsable</label>
                  <input [value]="doc()!.tecnicoNombre" disabled />
                </div>
                <div class="form-group">
                  <label>Fecha de visita</label>
                  <input type="date"
                         [value]="fechaStr(doc()!.fecha)"
                         [disabled]="!puedeEditar"
                         (change)="onFechaChange($any($event.target).value)" />
                </div>
              </div>

              <!-- Secciones -->
              @for (sec of secciones; track sec.id) {
                <div class="card mb-3">
                  <div class="card-header"
                       [class.open]="abierto(sec.id)"
                       [style.cursor]="bloqueado ? 'default' : 'pointer'"
                       (click)="toggle(sec.id)">
                    <span class="card-title">{{ sec.label }}</span>
                    @if (!bloqueado) {
                      <span class="card-chev">▾</span>
                    }
                  </div>

                  @if (abierto(sec.id)) {
                    <div class="card-body" style="padding:8px 16px">
                      @for (item of getItems(sec.id); track item.id) {
                        <div class="check-item">

                          <div class="check-top">
                            <span class="check-label" [class.na]="!item.aplica">
                              {{ item.descripcion }}
                              @if (!item.aplica) {
                                <span style="font-size:11px;margin-left:4px">
                                  (No aplica)
                                </span>
                              }
                              @if (item.esLimpieza) {
                                <span class="limpie-tag">Antes / Después</span>
                              }
                            </span>
                          </div>

                          <div class="foto-block">
                            <div class="foto-slots"
                                 [class.masked]="item.sinFotos">

                              @if (item.esLimpieza) {
                                <div class="foto-slot">
                                  <span class="slot-lbl">Antes</span>
                                  <div class="slot-box"
                                       [class.tiene-foto]="getFoto(item,'antes')">
                                    @if (getFoto(item, 'antes'); as f) {
                                      <img [src]="f.url" alt="antes"
                                           (click)="$event.stopPropagation()" />
                                    } @else {
                                      <span class="slot-plus">
                                        {{ (puedeEditar && !item.sinFotos) ? '+' : '—' }}
                                      </span>
                                    }
                                    @if (puedeEditar && !item.sinFotos) {
                                      <input type="file" accept="image/*"
                                             (change)="subirFoto($event,item,'antes')" />
                                    }
                                  </div>
                                </div>
                                <div class="foto-slot">
                                  <span class="slot-lbl">Después</span>
                                  <div class="slot-box"
                                       [class.tiene-foto]="getFoto(item,'despues')">
                                    @if (getFoto(item, 'despues'); as f) {
                                      <img [src]="f.url" alt="después"
                                           (click)="$event.stopPropagation()" />
                                    } @else {
                                      <span class="slot-plus">
                                        {{ (puedeEditar && !item.sinFotos) ? '+' : '—' }}
                                      </span>
                                    }
                                    @if (puedeEditar && !item.sinFotos) {
                                      <input type="file" accept="image/*"
                                             (change)="subirFoto($event,item,'despues')" />
                                    }
                                  </div>
                                </div>
                              } @else {
                                <div class="foto-slot">
                                  <span class="slot-lbl">Foto</span>
                                  <div class="slot-box"
                                       [class.tiene-foto]="getFoto(item,'evidencia')">
                                    @if (getFoto(item, 'evidencia'); as f) {
                                      <img [src]="f.url" alt="evidencia"
                                           (click)="$event.stopPropagation()" />
                                    } @else {
                                      <span class="slot-plus">
                                        {{ (puedeEditar && !item.sinFotos) ? '+' : '—' }}
                                      </span>
                                    }
                                    @if (puedeEditar && !item.sinFotos) {
                                      <input type="file" accept="image/*"
                                             (change)="subirFoto($event,item,'evidencia')" />
                                    }
                                  </div>
                                </div>
                              }

                            </div>

                            <div class="sin-row">
                              <input type="checkbox"
                                     [id]="'sf-' + item.id"
                                     [(ngModel)]="item.sinFotos"
                                     [disabled]="!puedeEditar" />
                              <label [for]="'sf-' + item.id">
                                Sin fotos — no incluir en el documento
                              </label>
                            </div>
                          </div>

                        </div>
                      }
                    </div>
                  }

                </div>
              }

              <!-- Observaciones -->
              @if (observaciones().length > 0) {
                <div class="card mb-3">
                  <div class="card-header"
                       [class.open]="abierto('obs')"
                       [style.cursor]="bloqueado ? 'default' : 'pointer'"
                       (click)="toggle('obs')">
                    <span class="card-title">Observaciones</span>
                    @if (!bloqueado) {
                      <span class="card-chev">▾</span>
                    }
                  </div>

                  @if (abierto('obs')) {
                    <div class="card-body" style="padding:8px 16px">
                      @for (obs of observaciones(); track obs.numero) {
                        <div class="check-item">

                          <div class="check-top" style="margin-bottom:6px">
                            <span style="font-size:12px;color:var(--gris-med);
                                         min-width:22px;flex-shrink:0">
                              {{ obs.numero }}.
                            </span>
                            <span class="check-label">
                              {{ obs.descripcion }}
                            </span>
                          </div>

                          <div class="foto-block">
                            <div class="foto-slots"
                                 [class.masked]="sinFotoObs[obs.numero]">
                              <div class="foto-slot">
                                <span class="slot-lbl">Foto</span>
                                <div class="slot-box"
                                     [class.tiene-foto]="fotoObs[obs.numero]">
                                  @if (fotoObs[obs.numero]; as f) {
                                    <img [src]="f.url" alt="obs"
                                         (click)="$event.stopPropagation()" />
                                  } @else {
                                    <span class="slot-plus">
                                      {{ (puedeEditar && !sinFotoObs[obs.numero]) ? '+' : '—' }}
                                    </span>
                                  }
                                  @if (puedeEditar && !sinFotoObs[obs.numero]) {
                                    <input type="file" accept="image/*"
                                           (change)="subirFotoObs($event,obs.numero)" />
                                  }
                                </div>
                              </div>
                            </div>
                            <div class="sin-row">
                              <input type="checkbox"
                                     [id]="'sfo-' + obs.numero"
                                     [checked]="sinFotoObs[obs.numero]"
                                     (change)="toggleSinFotoObs(obs.numero)"
                                     [disabled]="!puedeEditar" />
                              <label [for]="'sfo-' + obs.numero">
                                Sin foto
                              </label>
                            </div>
                          </div>

                        </div>
                      }
                    </div>

                    <div class="resumen-pri">
                      <span class="resumen-lbl">Prioridades:</span>
                      <span class="chip chip-alta">
                        {{ cntPri('alta') }} Alta
                      </span>
                      <span class="chip chip-media">
                        {{ cntPri('media') }} Media
                      </span>
                      <span class="chip chip-baja">
                        {{ cntPri('baja') }} Baja
                      </span>
                    </div>
                  }

                </div>
              }

            </div>
            <!-- fin contenido-doc -->

          }
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          @if (bloqueado) {
            @if (esAdmin) {
              <button class="btn btn-danger"
                      [disabled]="guardando()"
                      (click)="onReabrir()">
                🔓 Reabrir documentación
              </button>
            }
            <button class="btn btn-secondary"
                    (click)="cerrar.emit()">
              Cerrar
            </button>
          } @else {
            <button class="btn btn-secondary"
                    (click)="cerrar.emit()">
              Cancelar
            </button>
            <button class="btn btn-success"
                    [disabled]="guardando() || !validarCompleto()"
                    [title]="!validarCompleto()
                      ? 'Completa todos los campos primero'
                      : ''"
                    (click)="onFinalizar()">
              @if (guardando()) { <span class="spinner"></span> }
              Finalizar documentación
            </button>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-doc-box   { max-width: 720px; }
    .mb-3            { margin-bottom: 12px; }
    .contenido-doc   { position: relative; }
    .bloqueo-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      cursor: not-allowed;
      background: transparent;
    }
  `],
})
export class ModalDocumentacionComponent implements OnInit {
  @Input()  visita!: Visita;
  @Output() cerrar     = new EventEmitter<void>();
  @Output() finalizado = new EventEmitter<void>();
  @Output() reabierto  = new EventEmitter<void>();

  private docSvc     = inject(DocumentacionService);
  private obsSvc     = inject(ObservacionesService);
  private storage    = inject(StorageService);
  private auth       = inject(AuthService);
  private visitasSvc = inject(VisitasService);

  doc           = signal<Documentacion | null>(null);
  cargando      = signal(true);
  guardando     = signal(false);
  observaciones = signal<Observacion[]>([]);

  fotoObs:    Record<number, FotoItem> = {};
  sinFotoObs: Record<number, boolean>  = {};

  private abiertas = new Set<string>(['infraestructura']);

  get esAdmin():     boolean { return this.auth.esAdmin; }
  get bloqueado():   boolean { return !!this.doc()?.finalizado; }
  get puedeEditar(): boolean {
    return !this.doc()?.finalizado || this.esAdmin;
  }

  secciones = [
    { id: 'infraestructura' as SeccionDoc, label: '1. Infraestructura' },
    { id: 'energia'         as SeccionDoc, label: '2. Energía' },
    { id: 'equipos'         as SeccionDoc, label: '3. Equipos de Cómputo' },
    { id: 'conectividad'    as SeccionDoc, label: '4. Conectividad' },
  ];

  async ngOnInit(): Promise<void> {
    if (this.visita.tipo === 'poliza') {
      this.secciones = this.secciones.filter(s => s.id !== 'equipos');
    }

    const obs = await this.obsSvc.getObservaciones(this.visita.id!);
    if (obs && !obs.sinObservaciones) {
      this.observaciones.set(obs.observaciones);
    }

    const d = await this.docSvc.inicializarDocumentacion(
      this.visita.id!,
      this.visita.tipo,
      this.visita.tecnicoNombre,
    );
    this.doc.set(d);

    // Cargar fotos y sinFoto de observaciones desde Firestore
    if (d && d.items) {
      for (const ob of this.observaciones()) {
        const itemObs = d.items.find(i => i.id === `obs_${ob.numero}`);
        if (itemObs) {
          if (itemObs.fotos && itemObs.fotos.length > 0) {
            this.fotoObs[ob.numero] = itemObs.fotos[0];
          }
          if (itemObs.sinFotos) {
            this.sinFotoObs[ob.numero] = true;
          }
        }
      }
    }

    this.cargando.set(false);
  }

  // ── Secciones ──────────────────────────────────────────────────────────────
  getItems(seccion: SeccionDoc): ItemChecklist[] {
    return this.doc()?.items
      .filter(i => i.seccion === seccion && !i.id.startsWith('obs_')) ?? [];
  }

  abierto(id: string): boolean {
    if (this.bloqueado) return true;
    return this.abiertas.has(id);
  }

  toggle(id: string): void {
    if (this.bloqueado) return;
    this.abiertas.has(id)
      ? this.abiertas.delete(id)
      : this.abiertas.add(id);
  }

  // ── Fotos checklist ────────────────────────────────────────────────────────
  getFoto(item: ItemChecklist, tipo: string): FotoItem | undefined {
    return item.fotos.find(f => f.tipo === tipo);
  }

  async subirFoto(
    event: Event,
    item: ItemChecklist,
    tipo: string
  ): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const foto = await this.storage.subirFoto(
      this.visita.id!, item.id, tipo as TipoFoto, file
    );
    item.fotos = item.fotos.filter(f => f.tipo !== tipo);
    item.fotos.push(foto);
    await this.docSvc.guardarBorrador(this.visita.id!, this.doc()!);
  }

  // ── Fotos observaciones ────────────────────────────────────────────────────
  async subirFotoObs(event: Event, num: number): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const foto = await this.storage.subirFoto(
      this.visita.id!, `obs_${num}`, 'evidencia', file
    );
    this.fotoObs[num] = foto;

    // Guardar en Firestore dentro de los items del documento
    const d = this.doc();
    if (d) {
      const itemExistente = d.items.find(i => i.id === `obs_${num}`);
      if (itemExistente) {
        itemExistente.fotos = [foto];
      } else {
        d.items.push({
          id:          `obs_${num}`,
          seccion:     'conectividad',
          descripcion: '',
          esLimpieza:  false,
          aplica:      false,
          checked:     false,
          sinFotos:    false,
          fotos:       [foto],
        });
      }
      await this.docSvc.guardarBorrador(this.visita.id!, d);
    }
  }

  async toggleSinFotoObs(num: number): Promise<void> {
    if (!this.puedeEditar) return;
    this.sinFotoObs[num] = !this.sinFotoObs[num];

    // Guardar en Firestore
    const d = this.doc();
    if (d) {
      const itemExistente = d.items.find(i => i.id === `obs_${num}`);
      if (itemExistente) {
        itemExistente.sinFotos = this.sinFotoObs[num];
      } else {
        d.items.push({
          id:          `obs_${num}`,
          seccion:     'conectividad',
          descripcion: '',
          esLimpieza:  false,
          aplica:      false,
          checked:     false,
          sinFotos:    this.sinFotoObs[num],
          fotos:       [],
        });
      }
      await this.docSvc.guardarBorrador(this.visita.id!, d);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  fechaStr(f: any): string {
    if (!f) return '';
    const d = f?.toDate ? f.toDate() : new Date(f);
    return d.toISOString().split('T')[0];
  }

  onFechaChange(val: string): void {
    if (this.doc()) this.doc()!.fecha = new Date(val);
  }

  cntPri(p: string): number {
    return this.observaciones().filter(o => o.prioridad === p).length;
  }

  // ── Validación ─────────────────────────────────────────────────────────────
  validarCompleto(): boolean {
    const items = this.doc()?.items ?? [];
    // Validar solo items normales, no los de obs
    for (const item of items.filter(i => !i.id.startsWith('obs_'))) {
      if (!item.fotos.length && !item.sinFotos) return false;
    }
    // Validar fotos de observaciones
    for (const obs of this.observaciones()) {
      if (!this.fotoObs[obs.numero] && !this.sinFotoObs[obs.numero]) return false;
    }
    return true;
  }

  // ── Finalizar ──────────────────────────────────────────────────────────────
  async onFinalizar(): Promise<void> {
    if (!this.validarCompleto()) {
      alert(
        'Faltan campos por completar.\n' +
        'Sube una foto o marca "Sin fotos" en cada ítem.'
      );
      return;
    }
    this.guardando.set(true);
    try {
      await this.docSvc.finalizar(this.visita.id!, this.doc()!);
      this.finalizado.emit();
    } finally {
      this.guardando.set(false);
    }
  }

  // ── Admin: reabrir ─────────────────────────────────────────────────────────
  async onReabrir(): Promise<void> {
    const ok = confirm(
      '¿Confirmas reabrir la documentación de este sitio?\n' +
      'Tendrán que volver a llenarla desde cero.'
    );
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.visitasSvc.reabrirDocumentacion(this.visita.id!);
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