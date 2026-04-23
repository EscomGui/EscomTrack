import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { SITIOS_CEDIS, SitioCedis } from '../../../core/data/sitios-poliza.data';

@Component({
  selector: 'app-calendario-cedis',
  standalone: true,
  imports: [
    CommonModule, NavbarComponent,
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
              CEDIS · Ciclo {{ cicloLabel() }} · {{ visitas().length }} sitios
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

      @if (cargando()) {
        <div class="estado-carga">
          <span class="spinner"></span><span>Cargando sitios...</span>
        </div>
      } @else if (visitas().length === 0) {
        <div class="estado-vacio">
          <span style="font-size:36px">📭</span>
          <p>No hay sitios CEDIS programados para este mes.</p>
        </div>
      } @else {

        <table class="cal-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>Sitio</th>
              <th style="width:70px;text-align:center">Visitas</th>
              <th>Técnico</th>
              <th class="col-estado">Estado</th>
              <th class="col-acc">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (v of visitas(); track v.id; let i = $index) {
              <tr [class]="'row-' + rowClass(v.estado)">
                <td class="col-num">{{ i + 1 }}</td>
                <td class="col-nombre">{{ v.sitioNombre }}</td>
                <td style="text-align:center">
                  <span class="text-muted">{{ frecuencia(v.sitioId) }}×</span>
                </td>
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
          </tbody>
        </table>

        <div class="sitios-movil">
          @for (v of visitas(); track v.id; let i = $index) {
            <div class="sitio-card-movil" [class]="'row-' + rowClass(v.estado)">
              <div class="sitio-card-top">
                <div>
                  <div class="sitio-card-num"># {{ i+1 }} · {{ frecuencia(v.sitioId) }}× año</div>
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
        </div>

      }

    </div>

    <!-- Template acciones -->
    <ng-template #acciones let-v="v">
      @switch (v.estado) {

        @case ('pendiente') {
          <button class="btn btn-orange btn-sm" (click)="onEnCamino(v)">
            🚗 En camino
          </button>
        }

        @case ('en_camino') {
          @if (esMiVisita(v) || esAdmin) {
            <button class="btn btn-primary btn-sm" (click)="onEnSitio(v)">
              📍 Llegué al sitio
            </button>
          } @else {
            <span class="badge-servicio">En servicio: {{ v.tecnicoNombre }}</span>
          }
        }

        @case ('en_sitio') {
          @if (esMiVisita(v) || esAdmin) {
            <button class="btn btn-secondary btn-sm" (click)="onRealizar(v)">
              🔧 Iniciar servicio
            </button>
          } @else {
            <span class="badge-servicio">En servicio: {{ v.tecnicoNombre }}</span>
          }
        }

        @case ('en_proceso') {
          @if (esMiVisita(v) || esAdmin) {
            <button class="btn btn-secondary btn-sm" (click)="abrirObs(v)">
              ✏️ Llenar observaciones
            </button>
          } @else {
            <span class="badge-servicio">En servicio: {{ v.tecnicoNombre }}</span>
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

      @if (esAdmin && v.estado !== 'pendiente') {
        <button class="btn btn-ghost btn-sm btn-icon"
                title="Ver detalles"
                (click)="verDetalles(v)">🕐</button>
        <button class="btn btn-danger btn-sm btn-icon"
                title="Regresar a pendiente"
                (click)="onRegresarPendiente(v)">↩</button>
      }
    </ng-template>

    <!-- Modal detalles -->
    @if (visitaDetalle()) {
      <div class="modal-backdrop" (click)="visitaDetalle.set(null)">
        <div class="modal-box modal-detalle" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">
              🕐 Detalles — {{ visitaDetalle()!.sitioNombre }}
            </span>
            <button class="modal-close" (click)="visitaDetalle.set(null)">×</button>
          </div>
          <div class="modal-body">
            <div class="detalle-grid">
              <div class="detalle-item">
                <span class="detalle-lbl">Técnico</span>
                <span class="detalle-val">{{ visitaDetalle()!.tecnicoNombre || '—' }}</span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">Estado actual</span>
                <span class="badge" [class]="badgeClass(visitaDetalle()!.estado)">
                  {{ labelEstado(visitaDetalle()!.estado) }}
                </span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">🚗 Hora de salida</span>
                <span class="detalle-val">{{ fmtFechaHora(visitaDetalle()!.horaSalida) }}</span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">📍 Hora de llegada</span>
                <span class="detalle-val">{{ fmtFechaHora(visitaDetalle()!.horaLlegada) }}</span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">🔧 Inicio de servicio</span>
                <span class="detalle-val">{{ fmtFechaHora(visitaDetalle()!.horaInicio) }}</span>
              </div>
              <div class="detalle-item">
                <span class="detalle-lbl">✅ Hora de término</span>
                <span class="detalle-val">{{ fmtFechaHora(visitaDetalle()!.horaTermino) }}</span>
              </div>
              @if (visitaDetalle()!.horaSalida && visitaDetalle()!.horaTermino) {
                <div class="detalle-item detalle-full">
                  <span class="detalle-lbl">⏱ Duración total</span>
                  <span class="detalle-val detalle-duracion">
                    {{ calcularDuracion(visitaDetalle()!.horaSalida, visitaDetalle()!.horaTermino) }}
                  </span>
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="visitaDetalle.set(null)">
              Cerrar
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
    .cal-wrap       { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }
    .cal-head       { display: flex; align-items: center; justify-content: space-between;
                      margin-bottom: 22px; flex-wrap: wrap; gap: 14px; }
    .cal-nav        { display: flex; align-items: center; gap: 14px; }
    .cal-nav h2     { margin-bottom: 2px; }
    .leyenda        { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .estado-carga   { display: flex; justify-content: center; align-items: center;
                      gap: 12px; padding: 60px; color: var(--gris-med); }
    .estado-vacio   { display: flex; flex-direction: column; align-items: center;
                      gap: 12px; padding: 60px; color: var(--gris-med); text-align: center; }
    .badge-servicio { font-size: 11px; color: var(--gris-med); font-style: italic; padding: 4px 0; }
    .sitios-movil   { display: none; }
    .modal-detalle  { max-width: 420px; }
    .detalle-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detalle-full   { grid-column: 1 / -1; }
    .detalle-item   {
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px; background: var(--gris-bg);
      border-radius: var(--radius-md); border: 1px solid var(--gris-border);
    }
    .detalle-lbl      { font-size: 11px; color: var(--gris-med); font-weight: 500; }
    .detalle-val      { font-size: 13px; font-weight: 600; color: var(--gris-osc); }
    .detalle-duracion { color: var(--azul-clar); font-size: 16px; }
    @media (max-width: 768px) {
      .cal-table    { display: none; }
      .sitios-movil { display: block; }
      .cal-wrap     { padding: 76px 12px 24px; }
      .detalle-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class CalendarioCedisComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private visitasSvc  = inject(VisitasService);
  private obsSvc      = inject(ObservacionesService);
  private docSvc      = inject(DocumentacionService);
  private reportesSvc = inject(ReportesService);
  private dialog      = inject(DialogService);
  auth                = inject(AuthService);

  anio          = signal(0);
  mes           = signal(0);
  cargando      = signal(true);
  visitas       = signal<Visita[]>([]);
  visitaModal   = signal<Visita | null>(null);
  modalActivo   = signal<'obs' | 'doc' | null>(null);
  visitaDetalle = signal<Visita | null>(null);

  get esAdmin(): boolean { return this.auth.esAdmin; }

  esMiVisita(v: Visita): boolean {
    const uid = this.auth.usuarioActual()?.uid;
    if (!uid) return false;
    if (!v.tecnicoId) return true;
    return v.tecnicoId === uid;
  }

  private sub?: Subscription;
  private subVisitas?: Subscription;

  ngOnInit(): void {
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

  async cargarVisitas(): Promise<void> {
    this.subVisitas?.unsubscribe();
    this.cargando.set(true);
    const sitiosMes = SITIOS_CEDIS.filter(
      (s: SitioCedis) => s.meses.includes(this.mes())
    );
    if (sitiosMes.length > 0) {
      await this.visitasSvc.crearVisitasMes(
        sitiosMes.map((s: SitioCedis) => ({ id: s.id, nombre: s.nombre })),
        'cedis', this.anio(), this.mes()
      );
    }
    this.subVisitas = this.visitasSvc
      .getVisitasPorMes('cedis', this.anio(), this.mes())
      .subscribe(vs => {
        this.visitas.set(vs);
        this.cargando.set(false);
        if (this.visitaDetalle()) {
          const act = vs.find(v => v.id === this.visitaDetalle()!.id);
          if (act) this.visitaDetalle.set(act);
        }
      });
  }

  cicloLabel(): string {
    return `Oct ${this.anio() - 1} — Sep ${this.anio()}`;
  }

  frecuencia(sitioId: string): number {
    return SITIOS_CEDIS.find(
      (s: SitioCedis) => s.id === sitioId
    )?.frecuencia ?? 0;
  }

  navMes(d: number): void {
    const ciclo = [10,11,12,1,2,3,4,5,6,7,8,9];
    const idx   = ciclo.indexOf(this.mes());
    const newM  = ciclo[(idx + d + 12) % 12];
    let a = this.anio();
    if (d > 0 && newM < this.mes()) a++;
    if (d < 0 && newM > this.mes()) a--;
    this.router.navigate(['/cedis', a, newM]);
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
      await this.visitasSvc.actualizarTecnico(v.id!, usuario.uid, usuario.nombre);
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

  async onRegresarPendiente(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '⚠',
      titulo:    'Regresar a pendiente',
      mensaje:   `¿Regresar "${v.sitioNombre}" a pendiente?`,
      detalle:   'Se borrarán observaciones, documentación y todos los horarios. Esta acción no se puede deshacer.',
      btnOk:     'Sí, regresar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!);
    await this.visitasSvc.regresarPendiente(v.id!);
  }

  abrirObs(v: Visita):    void { this.visitaModal.set(v); this.modalActivo.set('obs'); }
  abrirDoc(v: Visita):    void { this.visitaModal.set(v); this.modalActivo.set('doc'); }
  verDetalles(v: Visita): void { this.visitaDetalle.set(v); }

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
    const m: Record<EstadoVisita, string> = {
      pendiente:'', en_camino:'en-camino', en_sitio:'en-sitio',
      en_proceso:'en-proceso', obs_guardadas:'obs', completo:'completo'
    };
    return m[e];
  }

  badgeClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente:'badge-pendiente', en_camino:'badge-en-camino',
      en_sitio:'badge-en-sitio', en_proceso:'badge-en-proceso',
      obs_guardadas:'badge-obs', completo:'badge-completo'
    };
    return m[e];
  }

  labelEstado(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
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