import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ModalObservacionesComponent } from '../../observaciones/modal-observaciones/modal-observaciones.component';
import { ModalDocumentacionComponent } from '../../documentacion/modal-documentacion/modal-documentacion.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { VisitasService } from '../../../core/services/visitas.service';
import { ObservacionesService } from '../../../core/services/observaciones.service';
import { DocumentacionService } from '../../../core/services/documentacion.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { AuthService } from '../../../core/services/auth.service';
import { DialogService } from '../../../core/services/dialog.service';
import { Visita, EstadoVisita } from '../../../core/models/visita.model';
import { SITIOS_POLIZA, SitioBase } from '../../../core/data/sitios-poliza.data';

@Component({
  selector: 'app-calendario-polizas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NavbarComponent,
    ModalObservacionesComponent, ModalDocumentacionComponent,
    DialogComponent,
  ],
  template: `
    <app-navbar />

    <div class="cal-wrap">

      <div class="cal-head">
        <div class="cal-nav">
          <button class="btn btn-secondary btn-sm" (click)="navMes(-1)">‹</button>
          <div>
            <h2>{{ nombreMes(mes()) }} {{ anio() }}</h2>
            <p class="text-muted">
              Pólizas · Grupo {{ grupo() }} · {{ visitas().length }} sitios
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="navMes(1)">›</button>
        </div>
        <div class="leyenda">
          <span class="badge badge-pendiente">Pendiente</span>
          <span class="badge badge-en-camino">En camino</span>
          <span class="badge badge-en-sitio">En sitio</span>
          <span class="badge badge-en-proceso">En proceso</span>
          <span class="badge badge-obs">Obs. guardadas</span>
          <span class="badge badge-completo">Completo</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filtro-tabs">
        <button class="ftab" [class.active]="filtroEstado()==='todos'"
                (click)="filtroEstado.set('todos')">
          Todos <span class="ftab-cnt">{{ visitas().length }}</span>
        </button>
        <button class="ftab" [class.active]="filtroEstado()==='pendiente'"
                (click)="filtroEstado.set('pendiente')">
          Pendiente <span class="ftab-cnt">{{ cntEstado('pendiente') }}</span>
        </button>
        <button class="ftab ftab-en-camino"
                [class.active]="filtroEstado()==='en_camino'"
                (click)="filtroEstado.set('en_camino')">
          En camino <span class="ftab-cnt">{{ cntEstado('en_camino') }}</span>
        </button>
        <button class="ftab ftab-en-sitio"
                [class.active]="filtroEstado()==='en_sitio'"
                (click)="filtroEstado.set('en_sitio')">
          En sitio <span class="ftab-cnt">{{ cntEstado('en_sitio') }}</span>
        </button>
        <button class="ftab ftab-en-proceso"
                [class.active]="filtroEstado()==='en_proceso'"
                (click)="filtroEstado.set('en_proceso')">
          En proceso <span class="ftab-cnt">{{ cntEstado('en_proceso') }}</span>
        </button>
        <button class="ftab ftab-obs"
                [class.active]="filtroEstado()==='obs_guardadas'"
                (click)="filtroEstado.set('obs_guardadas')">
          Obs. guardadas <span class="ftab-cnt">{{ cntEstado('obs_guardadas') }}</span>
        </button>
        <button class="ftab ftab-completo"
                [class.active]="filtroEstado()==='completo'"
                (click)="filtroEstado.set('completo')">
          Completo <span class="ftab-cnt">{{ cntEstado('completo') }}</span>
        </button>
      </div>

      @if (cargando()) {
        <div class="estado-carga">
          <span class="spinner"></span><span>Cargando sitios...</span>
        </div>
      } @else {

        <!-- Banner sitio activo -->
@if (serviciosEnCurso.length > 0) {
  <div class="servicios-activos">

    @if (esAdmin && serviciosEnCurso.length > 1) {
      <div class="servicios-header">
        <span class="servicios-titulo">
          📍 Servicios en curso
          <span class="servicios-cnt">{{ serviciosEnCurso.length }}</span>
        </span>
      </div>
    }

    @for (sv of serviciosEnCurso; track sv.id) {
      <div class="sitio-activo-banner">
        <div class="sab-left">
          <span class="sab-ico">
            {{ sv.estado === 'en_camino'    ? '🚗' :
               sv.estado === 'en_sitio'     ? '📍' :
               sv.estado === 'en_proceso'   ? '🔧' : '📋' }}
          </span>
          <div>
            <div class="sab-label">
              {{ esAdmin && sv.tecnicoNombre
                 ? sv.tecnicoNombre
                 : 'Tu servicio en curso' }}
            </div>
            <div class="sab-nombre">{{ sv.sitioNombre }}</div>
          </div>
        </div>
        <div class="sab-right">
          <span class="badge" [class]="badgeClass(sv.estado)">
            {{ labelEstado(sv.estado) }}
          </span>
          <ng-container
            *ngTemplateOutlet="acciones; context:{v:sv}" />
        </div>
      </div>
    }

  </div>
}

        <!-- Tabla desktop -->
        <table class="cal-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>
                <div class="th-con-busqueda">
                  Sitio
                  <div style="position:relative;display:flex;align-items:center">
                    <input type="text"
                           [ngModel]="busqueda()"
                           (ngModelChange)="busqueda.set($event)"
                           placeholder="🔍 Buscar..."
                           class="search-inline"
                           (click)="$event.stopPropagation()" />
                    @if (busqueda()) {
                      <button class="search-inline-clear"
                              (click)="busqueda.set('')">×</button>
                    }
                  </div>
                </div>
              </th>
              <th>Técnico</th>
              <th class="col-estado">Estado</th>
              <th class="col-acc">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (v of visitasFiltradas; track v.id; let i = $index) {
              <tr [class]="'row-' + rowClass(v.estado)">
                <td class="col-num">{{ i + 1 }}</td>
                <td class="col-nombre">{{ v.sitioNombre }}</td>
                <td class="text-muted" style="font-size:12px">
                  {{ v.tecnicoNombre || '—' }}
                </td>
                <td class="col-estado">
                  <span class="badge" [class]="badgeClass(v.estado)">
                    {{ labelEstado(v.estado) }}
                  </span>
                </td>
                <td class="col-acc">
                  <div class="col-acc-inner">
                    <ng-container *ngTemplateOutlet="acciones; context:{v:v}" />
                  </div>
                </td>
              </tr>
            }
            @if (visitasFiltradas.length === 0) {
              <tr>
                <td colspan="5" class="td-vacio">
                  No hay sitios con ese filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Cards móvil -->
        <div class="sitios-movil">
          <div style="position:relative;margin-bottom:12px">
            <input type="text"
                   [ngModel]="busqueda()"
                   (ngModelChange)="busqueda.set($event)"
                   placeholder="🔍 Buscar sitio o técnico..."
                   class="search-movil" />
            @if (busqueda()) {
              <button class="search-movil-clear"
                      (click)="busqueda.set('')">×</button>
            }
          </div>
          @for (v of visitasFiltradas; track v.id; let i = $index) {
            <div class="sitio-card-movil" [class]="'row-' + rowClass(v.estado)">
              <div class="sitio-card-top">
                <div>
                  <div class="sitio-card-num"># {{ i + 1 }}</div>
                  <div class="sitio-card-nombre">{{ v.sitioNombre }}</div>
                  <div class="text-muted" style="font-size:11px;margin-top:2px">
                    {{ v.tecnicoNombre || 'Sin técnico asignado' }}
                  </div>
                </div>
                <span class="badge" [class]="badgeClass(v.estado)">
                  {{ labelEstado(v.estado) }}
                </span>
              </div>
              <div class="sitio-card-acc">
                <ng-container *ngTemplateOutlet="acciones; context:{v:v}" />
              </div>
            </div>
          }
          @if (visitasFiltradas.length === 0) {
            <div class="estado-vacio">
              <span style="font-size:32px">🔍</span>
              <p>No hay sitios con ese filtro.</p>
            </div>
          }
        </div>

      }

    </div>

    <!-- Template acciones -->
    <ng-template #acciones let-v="v">

      <!-- Visita completada directamente por superadmin — sin botones de obs/doc -->
      @if (v.estado === 'completo' && v.esCompletadoDirecto && !esSuperAdmin) {
        <span class="badge-servicio">
          Completado · {{ v.tecnicoNombre }}
        </span>
      } @else {

        @switch (v.estado) {

          @case ('pendiente') {
            <button class="btn btn-orange btn-sm" (click)="onEnCamino(v)">
              🚗 En camino
            </button>
            <!-- SuperAdmin puede completar directo -->
            @if (esSuperAdmin) {
              <button class="btn btn-success btn-sm"
                      (click)="completarDirecto(v)">
                ✅ Completar
              </button>
            }
          }

          @case ('en_camino') {
            @if (esMiVisita(v) || esAdmin) {
              <button class="btn btn-primary btn-sm" (click)="onEnSitio(v)">
                📍 Llegué al sitio
              </button>
            } @else {
              <span class="badge-servicio">
                En servicio: {{ v.tecnicoNombre }}
              </span>
            }
          }

          @case ('en_sitio') {
            @if (esMiVisita(v) || esAdmin) {
              <button class="btn btn-secondary btn-sm" (click)="onRealizar(v)">
                🔧 Iniciar servicio
              </button>
            } @else {
              <span class="badge-servicio">
                En servicio: {{ v.tecnicoNombre }}
              </span>
            }
          }

          @case ('en_proceso') {
            @if (esMiVisita(v) || esAdmin) {
              <button class="btn btn-secondary btn-sm" (click)="abrirObs(v)">
                ✏️ Llenar observaciones
              </button>
            } @else {
              <span class="badge-servicio">
                En servicio: {{ v.tecnicoNombre }}
              </span>
            }
          }

          @case ('obs_guardadas') {
            @if (esMiVisita(v) || esAdmin) {
              <button class="btn btn-ghost btn-sm" (click)="abrirObs(v)">
                ✓ Ver observaciones
              </button>
              <button class="btn btn-primary btn-sm" (click)="abrirDoc(v)">
                Llenar documentación
              </button>
            } @else {
              <button class="btn btn-ghost btn-sm" (click)="abrirObs(v)">
                ✓ Ver observaciones
              </button>
            }
            @if (esAdmin) {
              <button class="btn btn-secondary btn-sm" (click)="abrirTabla(v)">
                Tabla prioridades
              </button>
            }
          }

          @case ('completo') {
            <button class="btn btn-ghost btn-sm" (click)="abrirObs(v)">
              ✓ Observaciones
            </button>
            <button class="btn btn-ghost btn-sm" (click)="abrirDoc(v)">
              ✓ Documentación
            </button>
            @if (esAdmin) {
              <button class="btn btn-secondary btn-sm" (click)="abrirTabla(v)">
                Tabla prioridades
              </button>
              <button class="btn btn-success btn-sm" (click)="abrirVista(v)">
                Descargar .docx
              </button>
            }
          }

        }

        <!-- Botones admin -->
        @if (esAdmin && v.estado !== 'pendiente') {
          <button class="btn btn-ghost btn-sm btn-icon"
                  title="Ver detalles"
                  (click)="verDetalles(v)">🕐</button>
          <button class="btn btn-danger btn-sm btn-icon"
                  title="Regresar estado"
                  (click)="abrirRegresar(v)">↩</button>
        }

      }

    </ng-template>

    <!-- Modal detalles horario -->
    @if (visitaDetalle()) {
      <div class="modal-backdrop" (click)="visitaDetalle.set(null)">
        <div class="modal-box modal-detalle"
             (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">
              🕐 Detalles — {{ visitaDetalle()!.sitioNombre }}
            </span>
            <button class="modal-close"
                    (click)="visitaDetalle.set(null)">×</button>
          </div>
          <div class="modal-body">
            <div class="detalle-grid">
              <div class="detalle-item">
                <span class="detalle-lbl">Técnico</span>
                <span class="detalle-val">
                  {{ visitaDetalle()!.tecnicoNombre || '—' }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">Estado actual</span>
                <span class="badge" [class]="badgeClass(visitaDetalle()!.estado)">
                  {{ labelEstado(visitaDetalle()!.estado) }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">🚗 Hora de salida</span>
                <span class="detalle-val">
                  {{ fmtFechaHora(visitaDetalle()!.horaSalida) }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">📍 Hora de llegada</span>
                <span class="detalle-val">
                  {{ fmtFechaHora(visitaDetalle()!.horaLlegada) }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">🔧 Inicio de servicio</span>
                <span class="detalle-val">
                  {{ fmtFechaHora(visitaDetalle()!.horaInicio) }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">✅ Hora de término</span>
                <span class="detalle-val">
                  {{ fmtFechaHora(visitaDetalle()!.horaTermino) }}
                </span>
              </div>
              @if (visitaDetalle()!.horaSalida && visitaDetalle()!.horaTermino) {
                <div class="detalle-item detalle-full">
                  <span class="detalle-lbl">⏱ Duración total</span>
                  <span class="detalle-val detalle-duracion">
                    {{ calcularDuracion(
                        visitaDetalle()!.horaSalida,
                        visitaDetalle()!.horaTermino) }}
                  </span>
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary"
                    (click)="visitaDetalle.set(null)">Cerrar</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal regresar estado -->
    @if (visitaRegresar()) {
      <div class="modal-backdrop" (click)="visitaRegresar.set(null)">
        <div class="modal-box modal-regresar"
             (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">↩ Regresar estado</span>
            <button class="modal-close"
                    (click)="visitaRegresar.set(null)">×</button>
          </div>
          <div class="modal-body">
            @if (esSuperAdmin) {
              <div class="banner banner-info mb-3">
                <span>⭐</span>
                Como Super Admin conservas toda la información al regresar.
              </div>
            }
            <p style="margin-bottom:14px;color:var(--gris-osc)">
              Selecciona a qué estado deseas regresar
              <strong>{{ visitaRegresar()!.sitioNombre }}</strong>:
            </p>
            <div class="estados-lista">
              @for (e of estadosAnteriores(visitaRegresar()!.estado);
                    track e.valor) {
                <button class="estado-opcion"
                        (click)="confirmarRegresar(visitaRegresar()!, e.valor)">
                  <span class="estado-opcion-ico">{{ e.icono }}</span>
                  <div>
                    <div class="estado-opcion-nombre">{{ e.label }}</div>
                    <div class="estado-opcion-desc">
                      {{ esSuperAdmin ? e.descSuperAdmin : e.desc }}
                    </div>
                  </div>
                </button>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary"
                    (click)="visitaRegresar.set(null)">Cancelar</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal técnico — completar directo superadmin -->
    @if (visitaCompletarDirecto()) {
      <div class="modal-backdrop" (click)="visitaCompletarDirecto.set(null)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">✅ Marcar como completado</span>
            <button class="modal-close"
                    (click)="visitaCompletarDirecto.set(null)">×</button>
          </div>
          <div class="modal-body">
            <div class="banner banner-warn mb-3">
              <span>⚠</span>
              Esta acción marca el sitio como completo sin observaciones
              ni documentación. Solo Super Admin.
            </div>
            <p style="margin-bottom:8px;font-size:13px;color:var(--gris-osc)">
              Sitio: <strong>{{ visitaCompletarDirecto()!.sitioNombre }}</strong>
            </p>
            <div class="form-group">
              <label>Técnico responsable (obligatorio)</label>
              <select [(ngModel)]="tecnicoSelDirecto">
                <option value="">— Selecciona técnico —</option>
                @for (t of tecnicosDisponibles(); track t.uid) {
                  <option [value]="t.nombre">{{ t.nombre }}</option>
                }
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary"
                    (click)="visitaCompletarDirecto.set(null)">Cancelar</button>
            <button class="btn btn-success"
                    [disabled]="!tecnicoSelDirecto || completandoDirecto()"
                    (click)="confirmarCompletarDirecto()">
              @if (completandoDirecto()) { <span class="spinner"></span> }
              Confirmar completado
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modales obs/doc -->
    @if (visitaModal()) {
      @if (modalActivo() === 'obs') {
        <app-modal-observaciones
          [visita]="visitaModal()!"
          (cerrar)="cerrarModal()"
          (guardado)="cerrarModal()"
          (reabierto)="cerrarModal()"
        />
      }
      @if (modalActivo() === 'doc') {
        <app-modal-documentacion
          [visita]="visitaModal()!"
          (cerrar)="cerrarModal()"
          (finalizado)="cerrarModal()"
          (reabierto)="cerrarModal()"
        />
      }
    }

    <app-dialog />
  `,
  styles: [`
    .cal-wrap  { max-width: 1100px; margin: 0 auto; padding: 90px 24px 28px; }
    .sitios-movil { display: none; }
    @media (max-width: 768px) {
      .cal-table    { display: none; }
      .sitios-movil { display: block; }
      .cal-wrap     { padding: 76px 12px 24px; }
    }
  `],
})
export class CalendarioPolizasComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private fs          = inject(Firestore);
  private visitasSvc  = inject(VisitasService);
  private obsSvc      = inject(ObservacionesService);
  private docSvc      = inject(DocumentacionService);
  private reportesSvc = inject(ReportesService);
  private dialog      = inject(DialogService);
  auth                = inject(AuthService);

  anio                  = signal(0);
  mes                   = signal(0);
  cargando              = signal(true);
  visitas               = signal<Visita[]>([]);
  busqueda              = signal('');
  filtroEstado          = signal<EstadoVisita | 'todos'>('todos');
  visitaModal           = signal<Visita | null>(null);
  modalActivo           = signal<'obs' | 'doc' | null>(null);
  visitaDetalle         = signal<Visita | null>(null);
  visitaRegresar        = signal<Visita | null>(null);
  visitaCompletarDirecto = signal<Visita | null>(null);
  tecnicoSelDirecto     = '';
  completandoDirecto    = signal(false);
  tecnicosDisponibles   = signal<{ uid: string; nombre: string }[]>([]);

  get esAdmin():     boolean { return this.auth.esAdmin; }
  get esSuperAdmin(): boolean { return this.auth.esSuperAdmin; }

  get visitasFiltradas(): Visita[] {
    let lista = this.visitas();
    if (this.filtroEstado() !== 'todos') {
      lista = lista.filter(v => v.estado === this.filtroEstado());
    }
    const q = this.busqueda().toLowerCase().trim();
    if (q) {
      lista = lista.filter(v =>
        v.sitioNombre.toLowerCase().includes(q) ||
        (v.tecnicoNombre ?? '').toLowerCase().includes(q)
      );
    }
    return lista;
  }

get serviciosEnCurso(): Visita[] {
  const activos = ['en_camino','en_sitio','en_proceso','obs_guardadas'];
  if (this.esAdmin) {
    return this.visitas().filter(v => activos.includes(v.estado));
  }
  const uid = this.auth.usuarioActual()?.uid;
  if (!uid) return [];
  return this.visitas().filter(v =>
    v.tecnicoId === uid && activos.includes(v.estado)
  );
}

  cntEstado(estado: EstadoVisita): number {
    return this.visitas().filter(v => v.estado === estado).length;
  }

  esMiVisita(v: Visita): boolean {
    const uid = this.auth.usuarioActual()?.uid;
    if (!uid) return false;
    if (!v.tecnicoId) return true;
    return v.tecnicoId === uid;
  }

  private sub?: Subscription;
  private subVisitas?: Subscription;

  ngOnInit(): void {
    this.cargarTecnicos();
    this.sub = this.route.params.subscribe(async p => {
      this.anio.set(+p['anio']);
      this.mes.set(+p['mes']);
      await this.cargarVisitas();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subVisitas?.unsubscribe();
  }

  private async cargarTecnicos(): Promise<void> {
    const q    = query(
      collection(this.fs, 'usuarios'),
      where('activo', '==', true)
    );
    const snap = await getDocs(q);
    this.tecnicosDisponibles.set(
      snap.docs.map(d => ({
        uid:    d.id,
        nombre: (d.data() as any).nombre,
      }))
    );
  }

  async cargarVisitas(): Promise<void> {
    this.subVisitas?.unsubscribe();
    this.cargando.set(true);
    const g = this.grupo();
    const sitiosMes = SITIOS_POLIZA.filter((s: SitioBase) => s.grupo === g);
    await this.visitasSvc.crearVisitasMes(
      sitiosMes.map((s: SitioBase) => ({ id: s.id, nombre: s.nombre })),
      'poliza', this.anio(), this.mes()
    );
    this.subVisitas = this.visitasSvc
      .getVisitasPorMes('poliza', this.anio(), this.mes())
      .subscribe(vs => {
        this.visitas.set(vs);
        this.cargando.set(false);
        if (this.visitaDetalle()) {
          const act = vs.find(v => v.id === this.visitaDetalle()!.id);
          if (act) this.visitaDetalle.set(act);
        }
      });
  }

  grupo(): number {
    const mapa: Record<number,number> = {
      1:1,2:2,3:3,4:4,5:1,6:2,7:3,8:4,9:1,10:2,11:3,12:4
    };
    return mapa[this.mes()] ?? 1;
  }

  navMes(d: number): void {
    let m = this.mes() + d;
    let a = this.anio();
    if (m > 12) { m = 1;  a++; }
    if (m < 1)  { m = 12; a--; }
    this.router.navigate(['/polizas', a, m]);
  }

  async onEnCamino(v: Visita): Promise<void> {
    const hora = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });
    const ok = await this.dialog.confirm({
      tipo: 'info', icono: '🚗',
      titulo:    'Iniciar recorrido',
      mensaje:   `¿Confirmas iniciar el recorrido hacia "${v.sitioNombre}"?`,
      detalle:   `Hora de salida que se registrará: ${hora}`,
      btnOk:     'Sí, salir ahora',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    const usuario = this.auth.usuarioActual();
    if (usuario) {
      await this.visitasSvc.actualizarTecnico(
        v.id!, usuario.uid, usuario.nombre
      );
    }
    await this.visitasSvc.marcarEnCamino(v.id!);
  }

  async onEnSitio(v: Visita): Promise<void> {
    const hora = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });
    const ok = await this.dialog.confirm({
      tipo: 'info', icono: '📍',
      titulo:    'Confirmar llegada',
      mensaje:   `¿Confirmas que llegaste al sitio "${v.sitioNombre}"?`,
      detalle:   `Hora de llegada que se registrará: ${hora}`,
      btnOk:     'Sí, ya llegué',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.marcarEnSitio(v.id!);
  }

  async onRealizar(v: Visita): Promise<void> {
    const hora = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });
    const ok = await this.dialog.confirm({
      tipo: 'info', icono: '🔧',
      titulo:    'Iniciar servicio',
      mensaje:   `¿Confirmas iniciar el servicio en "${v.sitioNombre}"?`,
      detalle:   `Hora de inicio que se registrará: ${hora}`,
      btnOk:     'Sí, iniciar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.marcarRealizado(v.id!);
  }

  // SuperAdmin — completar directo sin flujo
  completarDirecto(v: Visita): void {
    this.visitaCompletarDirecto.set(v);
    this.tecnicoSelDirecto = '';
  }

  async confirmarCompletarDirecto(): Promise<void> {
    const v = this.visitaCompletarDirecto();
    if (!v || !this.tecnicoSelDirecto) return;
    this.completandoDirecto.set(true);
    try {
      await this.visitasSvc.marcarCompletoDirecto(v.id!, this.tecnicoSelDirecto);
      this.visitaCompletarDirecto.set(null);
    } finally {
      this.completandoDirecto.set(false);
    }
  }

  abrirRegresar(v: Visita):  void { this.visitaRegresar.set(v); }
  abrirObs(v: Visita):       void { this.visitaModal.set(v); this.modalActivo.set('obs'); }
  abrirDoc(v: Visita):       void { this.visitaModal.set(v); this.modalActivo.set('doc'); }
  verDetalles(v: Visita):    void { this.visitaDetalle.set(v); }

  estadosAnteriores(estadoActual: EstadoVisita): {
    valor: EstadoVisita; label: string;
    icono: string; desc: string; descSuperAdmin: string;
  }[] {
    const todos = [
      {
        valor: 'pendiente' as EstadoVisita, label: 'Pendiente', icono: '⏳',
        desc:           'Borra técnico, horarios, observaciones y documentación',
        descSuperAdmin: 'Borra técnico y horarios. Conserva observaciones y documentación',
      },
      {
        valor: 'en_camino' as EstadoVisita, label: 'En camino', icono: '🚗',
        desc:           'Conserva técnico. Borra observaciones y documentación',
        descSuperAdmin: 'Conserva técnico, observaciones y documentación',
      },
      {
        valor: 'en_sitio' as EstadoVisita, label: 'En sitio', icono: '📍',
        desc:           'Conserva técnico. Borra observaciones y documentación',
        descSuperAdmin: 'Conserva técnico, observaciones y documentación',
      },
      {
        valor: 'en_proceso' as EstadoVisita, label: 'En proceso', icono: '🔧',
        desc:           'Conserva técnico. Borra observaciones y documentación',
        descSuperAdmin: 'Conserva técnico, observaciones y documentación',
      },
      {
        valor: 'obs_guardadas' as EstadoVisita, label: 'Observaciones guardadas',
        icono: '📋',
        desc:           'Conserva técnico y observaciones. Borra solo documentación',
        descSuperAdmin: 'Conserva técnico, observaciones y documentación',
      },
    ];
    const orden: EstadoVisita[] = [
      'pendiente','en_camino','en_sitio',
      'en_proceso','obs_guardadas','completo'
    ];
    const idxActual = orden.indexOf(estadoActual);
    return todos.filter(e => orden.indexOf(e.valor) < idxActual);
  }

  async confirmarRegresar(v: Visita, estado: EstadoVisita): Promise<void> {
    this.visitaRegresar.set(null);
    const estadoLabel = this.labelEstado(estado);
    const esSA = this.esSuperAdmin;
    const ok = await this.dialog.confirm({
      tipo:      estado === 'pendiente' ? 'danger' : 'warn',
      icono:     '↩',
      titulo:    `Regresar a ${estadoLabel}`,
      mensaje:   `¿Confirmas regresar "${v.sitioNombre}" a ${estadoLabel}?`,
      detalle:   esSA
        ? estado === 'pendiente'
          ? 'Se borrará el técnico y horarios. Observaciones y documentación se conservan.'
          : 'Solo se cambia el estado. Toda la información se conserva.'
        : estado === 'pendiente'
          ? 'Se borrará el técnico, horarios, observaciones y documentación.'
          : estado === 'obs_guardadas'
            ? 'Se borrará la documentación. Técnico y observaciones se conservan.'
            : 'Se borrarán observaciones y documentación. El técnico se conserva.',
      btnOk:     'Sí, regresar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.regresarAEstado(v.id!, estado, esSA);
  }

  async abrirTabla(v: Visita): Promise<void> {
    const obs = await this.obsSvc.getObservaciones(v.id!);
    this.reportesSvc.descargarXlsx(v.sitioNombre, obs?.observaciones ?? []);
  }

  async abrirVista(v: Visita): Promise<void> {
    const obs = await this.obsSvc.getObservaciones(v.id!);
    const doc = await this.docSvc.getDocumentacion(v.id!);
    if (!doc) return;
    const fecha = (() => {
      const f = doc.fecha as any;
      if (f?.toDate) return f.toDate().toLocaleDateString('es-MX');
      if (f instanceof Date) return f.toLocaleDateString('es-MX');
      return new Date(f).toLocaleDateString('es-MX');
    })();
    const mesAnio = this.nombreMes(this.mes()) + ' ' + this.anio();
    const observaciones = (obs?.observaciones ?? []).map((o: any) => {
      const itemObs = doc.items.find((i: any) => i.id === `obs_${o.numero}`);
      return {
        numero: o.numero, descripcion: o.descripcion, prioridad: o.prioridad,
        fotoUrl: itemObs?.fotos?.[0]?.url ?? null,
        orientacion: itemObs?.fotos?.[0]?.orientacion ?? 'horizontal',
        sinFoto: itemObs?.sinFotos ?? false,
      };
    });
    await this.reportesSvc.descargarDocx({
      sitioNombre: v.sitioNombre, tecnicoNombre: doc.tecnicoNombre,
      fecha, tipo: v.tipo, mesAnio, items: doc.items, observaciones,
    });
  }

  cerrarModal(): void {
    this.visitaModal.set(null);
    this.modalActivo.set(null);
    this.cargarVisitas();
  }

  fmtFechaHora(t: any): string {
    if (!t) return '—';
    const d = t?.toDate ? t.toDate() : new Date(t);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  calcularDuracion(inicio: any, fin: any): string {
    if (!inicio || !fin) return '—';
    const i = inicio?.toDate ? inicio.toDate() : new Date(inicio);
    const f = fin?.toDate    ? fin.toDate()    : new Date(fin);
    const diff = Math.floor((f.getTime() - i.getTime()) / 1000 / 60);
    if (diff < 0)  return '—';
    if (diff < 60) return `${diff} minutos`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}min` : `${h} horas`;
  }

  rowClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita,string> = {
      pendiente:'', en_camino:'en-camino', en_sitio:'en-sitio',
      en_proceso:'en-proceso', obs_guardadas:'obs', completo:'completo'
    };
    return m[e];
  }

  badgeClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita,string> = {
      pendiente:'badge-pendiente', en_camino:'badge-en-camino',
      en_sitio:'badge-en-sitio', en_proceso:'badge-en-proceso',
      obs_guardadas:'badge-obs', completo:'badge-completo'
    };
    return m[e];
  }

  labelEstado(e: EstadoVisita): string {
    const m: Record<EstadoVisita,string> = {
      pendiente:'Pendiente', en_camino:'En camino', en_sitio:'En sitio',
      en_proceso:'En proceso', obs_guardadas:'Observaciones guardadas',
      completo:'Completo'
    };
    return m[e];
  }

  nombreMes(n: number): string {
    return ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][n] ?? '';
  }
}