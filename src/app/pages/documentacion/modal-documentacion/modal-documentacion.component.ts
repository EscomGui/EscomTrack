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
import { DialogService } from '../../../core/services/dialog.service';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import {
  Documentacion, ItemChecklist, SeccionDoc, FotoItem, TipoFoto
} from '../../../core/models/documentacion.model';
import { Observacion } from '../../../core/models/observacion.model';
import { Visita } from '../../../core/models/visita.model';

// Items que permiten hasta 3 fotos
const ITEMS_MULTI_FOTO = [
  'verificacion_red_lan_wan',
  'supervision_tierra_fisica',
  'estado_fisico_tierra_fisica',
  'revision_pararrayos',
  'estado_fisico_pararrayos',
];

@Component({
  selector: 'app-modal-documentacion',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogComponent],
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

            <!-- Banners de estado -->
            @if (bloqueado && !esAdmin) {
              <div class="banner banner-lock mb-3">
                <span>🔒</span> Documentación finalizada — solo lectura.
              </div>
            }
            @if (bloqueado && esSuperAdmin) {
              <div class="banner banner-lock mb-3">
                <span>🔒</span> Documentación finalizada — solo lectura.
              </div>
              <div class="banner banner-info mb-3">
                <span>⭐</span>
                Como Super Admin puedes reabrir sin perder información.
              </div>
            }
            @if (bloqueado && esSoloAdmin) {
              <div class="banner banner-lock mb-3">
                <span>🔒</span> Documentación finalizada — solo lectura.
              </div>
              <div class="banner banner-warn mb-3">
                <span>⚠</span>
                Si reabres, la documentación se borrará completamente.
              </div>
            }
            @if (!bloqueado) {
              <div class="banner banner-info mb-3">
                <span>ℹ</span>
                Sube una foto o marca "Sin fotos" en cada ítem antes de finalizar.
              </div>
            }

            <!-- Información general -->
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
                    <span class="card-chev"
                          [style.transform]="abierto(sec.id)
                            ? 'rotate(180deg)' : 'none'">▾</span>
                  }
                </div>

                @if (abierto(sec.id)) {
                  <div class="card-body" style="padding:8px 16px">
                    @for (item of getItems(sec.id); track item.id) {
                      <div class="check-item">

                        <div class="check-top" style="margin-bottom:8px">
                          <span class="check-label">
                            {{ item.descripcion }}
                            @if (item.esLimpieza) {
                              <span class="limpie-tag">Antes / Después</span>
                            }
                          </span>
                        </div>

                        <!-- Layout foto + checkbox en fila -->
                        <div class="foto-row-layout">

                          <!-- Slots de foto -->
                          <div class="foto-slots-compact"
                               [class.masked]="item.sinFotos">

                            @if (item.esLimpieza) {
                              <!-- Foto Antes -->
                              <div class="foto-slot-compact">
                                <span class="slot-lbl-sm">Antes</span>
                                <div class="slot-box-sm"
                                     [class.tiene-foto]="getFoto(item,'antes')">
                                  @if (getFoto(item,'antes'); as f) {
                                    <img [src]="f.url" alt="antes" />
                                  } @else {
                                    <span class="slot-plus-sm">
                                      {{ (puedeEditar && !item.sinFotos) ? '+' : '—' }}
                                    </span>
                                  }
                                  @if (puedeEditar && !item.sinFotos) {
                                    <input type="file" accept="image/*"
                                           (change)="subirFoto($event,item,'antes')" />
                                  }
                                </div>
                              </div>
                              <!-- Foto Después -->
                              <div class="foto-slot-compact">
                                <span class="slot-lbl-sm">Después</span>
                                <div class="slot-box-sm"
                                     [class.tiene-foto]="getFoto(item,'despues')">
                                  @if (getFoto(item,'despues'); as f) {
                                    <img [src]="f.url" alt="después" />
                                  } @else {
                                    <span class="slot-plus-sm">
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
                              <!-- Foto evidencia principal -->
                              <div class="foto-slot-compact">
                                <span class="slot-lbl-sm">Foto</span>
                                <div class="slot-box-sm"
                                     [class.tiene-foto]="getFoto(item,'evidencia')">
                                  @if (getFoto(item,'evidencia'); as f) {
                                    <img [src]="f.url" alt="evidencia" />
                                  } @else {
                                    <span class="slot-plus-sm">
                                      {{ (puedeEditar && !item.sinFotos) ? '+' : '—' }}
                                    </span>
                                  }
                                  @if (puedeEditar && !item.sinFotos) {
                                    <input type="file" accept="image/*"
                                           (change)="subirFoto($event,item,'evidencia')" />
                                  }
                                </div>
                              </div>

                              <!-- Fotos adicionales para items multi-foto -->
                              @if (esMultiFoto(item.id)) {
                                @for (idx of fotosExtra(item);
                                      track idx; let fi = $index) {
                                  <div class="foto-slot-compact">
                                    <span class="slot-lbl-sm">
                                      Foto {{ fi + 2 }}
                                    </span>
                                    <div class="slot-box-sm"
                                         [class.tiene-foto]="getFotoExtra(item, fi)">
                                      @if (getFotoExtra(item, fi); as f) {
                                        <img [src]="f.url" alt="extra" />
                                      } @else {
                                        <span class="slot-plus-sm">
                                          {{ puedeEditar ? '+' : '—' }}
                                        </span>
                                      }
                                      @if (puedeEditar && !item.sinFotos) {
                                        <input type="file" accept="image/*"
                                               (change)="subirFotoExtra($event, item, fi)" />
                                      }
                                    </div>
                                  </div>
                                }
                                <!-- Botón agregar más fotos (máx 3) -->
                                @if (puedeEditar && !item.sinFotos &&
                                     getTotalFotos(item) < 3) {
                                  <div class="foto-slot-compact">
                                    <span class="slot-lbl-sm">&nbsp;</span>
                                    <button class="add-foto-btn"
                                            (click)="agregarFotoExtra(item)">
                                      + foto
                                    </button>
                                  </div>
                                }
                              }
                            }
                          </div>

                          <!-- Checkbox Sin fotos — junto a las fotos -->
                          <div class="sin-fotos-inline">
                            <label class="sin-fotos-label"
                                   [class.disabled]="getFotoCount(item) > 0">
                              <input type="checkbox"
                                     [(ngModel)]="item.sinFotos"
                                     [disabled]="!puedeEditar ||
                                                 getFotoCount(item) > 0"
                                     (change)="onSinFotosChange(item)" />
                              Sin fotos
                            </label>
                          </div>

                        </div>

                        <!-- Indicador de error si falta foto o checkbox -->
                        @if (mostrarErrorItem(item)) {
                          <div class="form-error" style="margin-top:4px">
                            Sube una foto o marca "Sin fotos".
                          </div>
                        }

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
                    <span class="card-chev"
                          [style.transform]="abierto('obs')
                            ? 'rotate(180deg)' : 'none'">▾</span>
                  }
                </div>

                @if (abierto('obs')) {
                  <div class="card-body" style="padding:8px 16px">
                    @for (obs of observaciones(); track obs.numero) {
                      <div class="check-item">
                        <div class="check-top" style="margin-bottom:8px">
                          <span style="font-size:12px;color:var(--gris-med);
                                       min-width:22px;flex-shrink:0">
                            {{ obs.numero }}.
                          </span>
                          <div style="flex:1">
                            <span class="check-label">{{ obs.descripcion }}</span>
                            @if (obs.nota) {
                              <div style="font-size:11px;color:var(--gris-med);
                                          margin-top:2px">
                                📝 {{ obs.nota }}
                              </div>
                            }
                          </div>
                        </div>

                        <div class="foto-row-layout">
                          <div class="foto-slots-compact"
                               [class.masked]="sinFotoObs[obs.numero]">
                            <div class="foto-slot-compact">
                              <span class="slot-lbl-sm">Foto</span>
                              <div class="slot-box-sm"
                                   [class.tiene-foto]="fotoObs[obs.numero]">
                                @if (fotoObs[obs.numero]; as f) {
                                  <img [src]="f.url" alt="obs" />
                                } @else {
                                  <span class="slot-plus-sm">
                                    {{ (puedeEditar && !sinFotoObs[obs.numero])
                                       ? '+' : '—' }}
                                  </span>
                                }
                                @if (puedeEditar && !sinFotoObs[obs.numero]) {
                                  <input type="file" accept="image/*"
                                         (change)="subirFotoObs($event, obs.numero)" />
                                }
                              </div>
                            </div>
                          </div>

                          <div class="sin-fotos-inline">
                            <label class="sin-fotos-label"
                                   [class.disabled]="!!fotoObs[obs.numero]">
                              <input type="checkbox"
                                     [id]="'sfo-' + obs.numero"
                                     [checked]="sinFotoObs[obs.numero]"
                                     [disabled]="!puedeEditar || !!fotoObs[obs.numero]"
                                     (change)="toggleSinFotoObs(obs.numero)" />
                              Sin foto
                            </label>
                          </div>
                        </div>

                        @if (mostrarErrorObs(obs.numero)) {
                          <div class="form-error" style="margin-top:4px">
                            Sube una foto o marca "Sin foto".
                          </div>
                        }
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

            <!-- Indicador de completitud -->
            @if (!bloqueado) {
              <div class="completitud-bar">
                <div class="completitud-label">
                  Progreso: {{ completados() }} / {{ totalItems() }} ítems
                </div>
                <div class="completitud-track">
                  <div class="completitud-fill"
                       [style.width]="porcentaje() + '%'"
                       [class.completo]="porcentaje() === 100">
                  </div>
                </div>
              </div>
            }

          }

        </div>

        <div class="modal-footer">
          @if (bloqueado) {
            @if (esAdmin) {
              <button class="btn btn-danger"
                      [disabled]="guardando()"
                      (click)="onReabrir()">
                🔓 Reabrir documentación
              </button>
            }
            <button class="btn btn-secondary" (click)="cerrar.emit()">
              Cerrar
            </button>
          } @else {
            <button class="btn btn-secondary" (click)="cerrar.emit()">
              Cancelar
            </button>
            <button class="btn btn-success"
                    [disabled]="guardando() || !validarCompleto()"
                    [title]="!validarCompleto()
                      ? 'Completa todos los campos primero' : ''"
                    (click)="onFinalizar()">
              @if (guardando()) { <span class="spinner"></span> }
              Finalizar documentación
            </button>
          }
        </div>

      </div>
    </div>

    <app-dialog />
  `,
  styles: [`
    .modal-doc-box { max-width: 720px; }
    .mb-3          { margin-bottom: 12px; }

    /* Layout foto + checkbox en fila */
    .foto-row-layout {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Slots compactos */
    .foto-slots-compact {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .foto-slot-compact {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .slot-lbl-sm { font-size: 10px; color: var(--gris-med); }
    .slot-box-sm {
      width: 64px; height: 52px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--gris-clar);
      background: var(--gris-bg);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative; overflow: hidden;
      transition: border-color var(--trans);
      &:hover { border-color: var(--azul-clar); }
      &.tiene-foto { border-color: var(--azul-clar); }

      img {
        width: 100%; height: 100%;
        object-fit: cover;
        pointer-events: none;
        user-select: none;
      }
      input[type="file"] {
        position: absolute; inset: 0; opacity: 0;
        cursor: pointer; width: 100%; height: 100%;
        padding: 0; border: none;
      }
    }
    .slot-plus-sm {
      font-size: 18px;
      color: var(--gris-clar);
      pointer-events: none;
    }

    /* Checkbox Sin fotos inline */
    .sin-fotos-inline {
      flex-shrink: 0;
    }
    .sin-fotos-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--gris-med);
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      &.disabled { opacity: .5; cursor: not-allowed; }
      input[type="checkbox"] {
        width: 14px; height: 14px; cursor: pointer; flex-shrink: 0;
      }
    }

    /* Botón agregar foto extra */
    .add-foto-btn {
      width: 64px; height: 52px;
      border: 1px dashed var(--azul-clar);
      border-radius: var(--radius-sm);
      background: var(--azul-bg);
      color: var(--azul-clar);
      font-size: 11px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all var(--trans);
      &:hover { background: rgba(74,144,217,.15); }
    }

    /* Barra de progreso */
    .completitud-bar {
      margin-top: 16px;
      padding: 12px 14px;
      background: var(--gris-bg);
      border-radius: var(--radius-md);
      border: 1px solid var(--gris-border);
    }
    .completitud-label {
      font-size: 12px; color: var(--gris-med);
      margin-bottom: 6px;
    }
    .completitud-track {
      height: 6px; background: var(--gris-clar);
      border-radius: 3px; overflow: hidden;
    }
    .completitud-fill {
      height: 100%; background: var(--azul-clar);
      border-radius: 3px; transition: width 300ms ease;
      &.completo { background: #059669; }
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
  private dialog     = inject(DialogService);

  doc           = signal<Documentacion | null>(null);
  cargando      = signal(true);
  guardando     = signal(false);
  observaciones = signal<Observacion[]>([]);
  mostrarError  = signal(false);

  fotoObs:    Record<number, FotoItem> = {};
  sinFotoObs: Record<number, boolean>  = {};

  // Track de fotos extra para items multi-foto
  fotosExtraMap: Record<string, number> = {};

  private abiertas = new Set<string>(['infraestructura']);

  get esAdmin():      boolean { return this.auth.esAdmin; }
  get esSuperAdmin(): boolean { return this.auth.esSuperAdmin; }
  get esSoloAdmin():  boolean { return this.auth.esSoloAdmin; }
  get bloqueado():    boolean { return !!this.doc()?.finalizado; }
  get puedeEditar():  boolean { return !this.bloqueado || this.esSuperAdmin; }

  secciones: { id: SeccionDoc; label: string }[] = [
    { id: 'infraestructura', label: '1. Infraestructura' },
    { id: 'energia',         label: '2. Energía' },
    { id: 'equipos',         label: '3. Equipos de Cómputo' },
    { id: 'conectividad',    label: '4. Conectividad' },
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
      this.visita.id!, this.visita.tipo, this.visita.tecnicoNombre,
    );
    this.doc.set(d);

    if (d?.items) {
      for (const ob of this.observaciones()) {
        const itemObs = d.items.find(i => i.id === `obs_${ob.numero}`);
        if (itemObs) {
          if (itemObs.fotos?.length > 0) this.fotoObs[ob.numero] = itemObs.fotos[0];
          if (itemObs.sinFotos) this.sinFotoObs[ob.numero] = true;
        }
      }
      // Inicializar contadores de fotos extra
      for (const item of d.items) {
        if (this.esMultiFoto(item.id)) {
          this.fotosExtraMap[item.id] = Math.max(0, item.fotos.length - 1);
        }
      }
    }
    this.cargando.set(false);
  }

  // ── Helpers items ─────────────────────────────────────────────────────────
  getItems(seccion: SeccionDoc): ItemChecklist[] {
    return this.doc()?.items
      .filter(i => i.seccion === seccion && !i.id.startsWith('obs_')) ?? [];
  }

  esMultiFoto(itemId: string): boolean {
    return ITEMS_MULTI_FOTO.some(k => itemId.includes(k));
  }

  getFotoCount(item: ItemChecklist): number {
    return item.fotos?.length ?? 0;
  }

  getTotalFotos(item: ItemChecklist): number {
    return item.fotos?.length ?? 0;
  }

  fotosExtra(item: ItemChecklist): number[] {
    const extra = this.fotosExtraMap[item.id] ?? 0;
    return Array.from({ length: extra }, (_, i) => i);
  }

  getFoto(item: ItemChecklist, tipo: string): FotoItem | undefined {
    return item.fotos?.find(f => f.tipo === tipo);
  }

  getFotoExtra(item: ItemChecklist, idx: number): FotoItem | undefined {
    const extras = item.fotos?.filter(f => f.tipo === `extra_${idx}`) ?? [];
    return extras[0];
  }

  agregarFotoExtra(item: ItemChecklist): void {
    if (this.getTotalFotos(item) >= 3) return;
    this.fotosExtraMap[item.id] = (this.fotosExtraMap[item.id] ?? 0) + 1;
  }

  // ── Abrir/cerrar secciones ────────────────────────────────────────────────
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

  // ── Subir fotos ───────────────────────────────────────────────────────────
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
    // Si tiene foto, deshabilitar "Sin fotos"
    if (item.sinFotos) item.sinFotos = false;
    await this.docSvc.guardarBorrador(this.visita.id!, this.doc()!);
  }

  async subirFotoExtra(
    event: Event,
    item: ItemChecklist,
    idx: number
  ): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const tipo = `extra_${idx}`;
    const foto = await this.storage.subirFoto(
      this.visita.id!, item.id, tipo as TipoFoto, file
    );
    item.fotos = item.fotos.filter(f => f.tipo !== tipo);
    item.fotos.push(foto);
    await this.docSvc.guardarBorrador(this.visita.id!, this.doc()!);
  }

  async subirFotoObs(event: Event, num: number): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const foto = await this.storage.subirFoto(
      this.visita.id!, `obs_${num}`, 'evidencia', file
    );
    this.fotoObs[num] = foto;
    if (this.sinFotoObs[num]) this.sinFotoObs[num] = false;
    const d = this.doc();
    if (d) {
      const itemExistente = d.items.find(i => i.id === `obs_${num}`);
      if (itemExistente) {
        itemExistente.fotos = [foto];
        itemExistente.sinFotos = false;
      } else {
        d.items.push({
          id: `obs_${num}`, seccion: 'conectividad', descripcion: '',
          esLimpieza: false, aplica: false, checked: false,
          sinFotos: false, fotos: [foto],
        });
      }
      await this.docSvc.guardarBorrador(this.visita.id!, d);
    }
  }

  // Sin fotos — oculta automáticamente si hay foto
  onSinFotosChange(item: ItemChecklist): void {
    if (item.sinFotos) {
      // Quitar todas las fotos del slot visual (no del storage)
    }
    this.docSvc.guardarBorrador(this.visita.id!, this.doc()!);
  }

  async toggleSinFotoObs(num: number): Promise<void> {
    if (!this.puedeEditar) return;
    this.sinFotoObs[num] = !this.sinFotoObs[num];
    const d = this.doc();
    if (d) {
      const itemExistente = d.items.find(i => i.id === `obs_${num}`);
      if (itemExistente) {
        itemExistente.sinFotos = this.sinFotoObs[num];
      } else {
        d.items.push({
          id: `obs_${num}`, seccion: 'conectividad', descripcion: '',
          esLimpieza: false, aplica: false, checked: false,
          sinFotos: this.sinFotoObs[num], fotos: [],
        });
      }
      await this.docSvc.guardarBorrador(this.visita.id!, d);
    }
  }

  // ── Validación ────────────────────────────────────────────────────────────
  mostrarErrorItem(item: ItemChecklist): boolean {
    if (!this.mostrarError()) return false;
    return !item.fotos?.length && !item.sinFotos;
  }

  mostrarErrorObs(num: number): boolean {
    if (!this.mostrarError()) return false;
    return !this.fotoObs[num] && !this.sinFotoObs[num];
  }

  validarCompleto(): boolean {
    const items = this.doc()?.items ?? [];
    for (const item of items.filter(i => !i.id.startsWith('obs_'))) {
      if (!item.fotos?.length && !item.sinFotos) return false;
    }
    for (const obs of this.observaciones()) {
      if (!this.fotoObs[obs.numero] && !this.sinFotoObs[obs.numero]) return false;
    }
    return true;
  }

  // ── Progreso ──────────────────────────────────────────────────────────────
  totalItems(): number {
    const items = (this.doc()?.items ?? [])
      .filter(i => !i.id.startsWith('obs_')).length;
    return items + this.observaciones().length;
  }

  completados(): number {
    const items = (this.doc()?.items ?? [])
      .filter(i => !i.id.startsWith('obs_'))
      .filter(i => i.fotos?.length > 0 || i.sinFotos).length;
    const obs = this.observaciones()
      .filter(o => this.fotoObs[o.numero] || this.sinFotoObs[o.numero]).length;
    return items + obs;
  }

  porcentaje(): number {
    const t = this.totalItems();
    if (t === 0) return 100;
    return Math.round((this.completados() / t) * 100);
  }

  // ── Otros helpers ─────────────────────────────────────────────────────────
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

  // ── Finalizar ─────────────────────────────────────────────────────────────
  async onFinalizar(): Promise<void> {
    this.mostrarError.set(true);
    if (!this.validarCompleto()) {
      await this.dialog.confirm({
        tipo: 'warn', icono: '⚠',
        titulo:  'Campos incompletos',
        mensaje: 'Faltan fotos por completar.',
        detalle: 'Sube una foto o marca "Sin fotos" en cada ítem.',
        btnOk:   'Entendido',
      });
      return;
    }
    const ok = await this.dialog.confirm({
      tipo: 'success', icono: '✅',
      titulo:    'Finalizar documentación',
      mensaje:   `¿Confirmas finalizar la documentación de "${this.visita.sitioNombre}"?`,
      detalle:   'Una vez finalizada no podrás modificarla a menos que el admin la reabra.',
      btnOk:     'Sí, finalizar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.docSvc.finalizar(this.visita.id!, this.doc()!);
      this.finalizado.emit();
    } finally {
      this.guardando.set(false);
    }
  }

  // ── Reabrir ───────────────────────────────────────────────────────────────
  async onReabrir(): Promise<void> {
    const esSA = this.esSuperAdmin;
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '🔓',
      titulo:    'Reabrir documentación',
      mensaje:   `¿Confirmas reabrir la documentación de "${this.visita.sitioNombre}"?`,
      detalle:   esSA
        ? 'La documentación se conservará. Solo cambia el estado.'
        : 'La documentación se borrará completamente.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.visitasSvc.reabrirDocumentacion(this.visita.id!, esSA);
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