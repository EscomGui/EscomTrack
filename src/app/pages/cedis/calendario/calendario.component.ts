import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ModalObservacionesComponent } from '../../observaciones/modal-observaciones/modal-observaciones.component';
import { ModalDocumentacionComponent } from '../../documentacion/modal-documentacion/modal-documentacion.component';
import { VisitasService } from '../../../core/services/visitas.service';
import { ObservacionesService } from '../../../core/services/observaciones.service';
import { DocumentacionService } from '../../../core/services/documentacion.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Visita, EstadoVisita } from '../../../core/models/visita.model';
import { SITIOS_CEDIS, SitioCedis } from '../../../core/data/sitios-poliza.data';

@Component({
  selector: 'app-calendario-cedis',
  standalone: true,
  imports: [
    CommonModule, NavbarComponent,
    ModalObservacionesComponent, ModalDocumentacionComponent,
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

        <!-- Tabla desktop -->
        <table class="cal-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>Sitio</th>
              <th style="width:80px;text-align:center">Visitas/año</th>
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
                <td class="col-estado">
                  <span class="badge" [class]="badgeClass(v.estado)">
                    {{ labelEstado(v.estado) }}
                  </span>
                </td>
                <td class="col-acc">
                  <div class="col-acc-inner">
                    <ng-container *ngTemplateOutlet="acciones; context: { v: v }" />
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Cards móvil -->
        <div class="sitios-movil">
          @for (v of visitas(); track v.id; let i = $index) {
            <div class="sitio-card-movil" [class]="'row-' + rowClass(v.estado)">
              <div class="sitio-card-top">
                <div>
                  <div class="sitio-card-num"># {{ i + 1 }} · {{ frecuencia(v.sitioId) }}× año</div>
                  <div class="sitio-card-nombre">{{ v.sitioNombre }}</div>
                </div>
                <span class="badge" [class]="badgeClass(v.estado)">
                  {{ labelEstado(v.estado) }}
                </span>
              </div>
              <div class="sitio-card-acc">
                <ng-container *ngTemplateOutlet="acciones; context: { v: v }" />
              </div>
            </div>
          }
        </div>

      }

    </div>

    <!-- Template de acciones -->
    <ng-template #acciones let-v="v">
      @switch (v.estado) {

        @case ('pendiente') {
          <button class="btn btn-orange btn-sm" (click)="onEnCamino(v)">
            🚗 En camino
          </button>
          @if (esAdmin) {
            <button class="btn btn-danger btn-sm btn-icon"
                    title="Eliminar sitio"
                    (click)="onEliminar(v)">🗑</button>
          }
        }

        @case ('en_camino') {
          <button class="btn btn-primary btn-sm" (click)="onEnSitio(v)">
            📍 Llegué al sitio
          </button>
        }

        @case ('en_sitio') {
          <button class="btn btn-secondary btn-sm" (click)="onRealizar(v)">
            ✏️ Llenar observaciones
          </button>
        }

        @case ('en_proceso') {
          <button class="btn btn-secondary btn-sm" (click)="abrirObs(v)">
            Llenar observaciones
          </button>
        }

        @case ('obs_guardadas') {
          <button class="btn btn-ghost btn-sm" (click)="abrirObs(v)">
            ✓ Ver observaciones
          </button>
          <button class="btn btn-primary btn-sm" (click)="abrirDoc(v)">
            Llenar documentación
          </button>
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
        <button class="btn btn-danger btn-sm btn-icon"
                title="Regresar a pendiente"
                (click)="onRegresarPendiente(v)">↩</button>
      }
    </ng-template>

    <!-- Modales -->
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
  `,
  styles: [`
    .cal-wrap     { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }
    .cal-head     { display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 22px; flex-wrap: wrap; gap: 14px; }
    .cal-nav      { display: flex; align-items: center; gap: 14px; }
    .cal-nav h2   { margin-bottom: 2px; }
    .leyenda      { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .estado-carga { display: flex; justify-content: center; align-items: center;
                    gap: 12px; padding: 60px; color: var(--gris-med); font-size: 14px; }
    .estado-vacio { display: flex; flex-direction: column; align-items: center;
                    gap: 12px; padding: 60px; color: var(--gris-med); text-align: center; }
    .sitios-movil { display: none; }
    @media (max-width: 768px) {
      .cal-table    { display: none; }
      .sitios-movil { display: block; }
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
  auth                = inject(AuthService);

  anio        = signal(0);
  mes         = signal(0);
  cargando    = signal(true);
  visitas     = signal<Visita[]>([]);
  visitaModal = signal<Visita | null>(null);
  modalActivo = signal<'obs' | 'doc' | null>(null);

  get esAdmin(): boolean { return this.auth.esAdmin; }

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
    const sitiosMes = SITIOS_CEDIS.filter((s: SitioCedis) => s.meses.includes(this.mes()));
    if (sitiosMes.length > 0) {
      await this.visitasSvc.crearVisitasMes(
        sitiosMes.map((s: SitioCedis) => ({ id: s.id, nombre: s.nombre })),
        'cedis', this.anio(), this.mes()
      );
    }
    this.subVisitas = this.visitasSvc
      .getVisitasPorMes('cedis', this.anio(), this.mes())
      .subscribe(vs => { this.visitas.set(vs); this.cargando.set(false); });
  }

  cicloLabel(): string {
    return `Oct ${this.anio() - 1} — Sep ${this.anio()}`;
  }

  frecuencia(sitioId: string): number {
    return SITIOS_CEDIS.find((s: SitioCedis) => s.id === sitioId)?.frecuencia ?? 0;
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

  // ── Acciones ──────────────────────────────────────────────────────────────
  async onEnCamino(v: Visita):  Promise<void> { await this.visitasSvc.marcarEnCamino(v.id!); }
  async onEnSitio(v: Visita):   Promise<void> { await this.visitasSvc.marcarEnSitio(v.id!); }
  async onRealizar(v: Visita):  Promise<void> { await this.visitasSvc.marcarRealizado(v.id!); }

  async onRegresarPendiente(v: Visita): Promise<void> {
    const ok = confirm(`¿Regresar "${v.sitioNombre}" a pendiente?\nSe borrarán observaciones y documentación.`);
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!);
    await this.visitasSvc.regresarPendiente(v.id!);
  }

  async onEliminar(v: Visita): Promise<void> {
    const ok = confirm(`¿Eliminar "${v.sitioNombre}" de este mes?`);
    if (!ok) return;
    await this.visitasSvc.eliminarVisita(v.id!);
  }

  abrirObs(v: Visita): void { this.visitaModal.set(v); this.modalActivo.set('obs'); }
  abrirDoc(v: Visita): void { this.visitaModal.set(v); this.modalActivo.set('doc'); }

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
        numero:      o.numero,
        descripcion: o.descripcion,
        prioridad:   o.prioridad,
        fotoUrl:     itemObs?.fotos?.[0]?.url ?? null,
        orientacion: itemObs?.fotos?.[0]?.orientacion ?? 'horizontal',
        sinFoto:     itemObs?.sinFotos ?? false,
      };
    });
    await this.reportesSvc.descargarDocx({
      sitioNombre:   v.sitioNombre,
      tecnicoNombre: doc.tecnicoNombre,
      fecha, tipo: v.tipo, mesAnio,
      items:         doc.items,
      observaciones,
    });
  }

  cerrarModal(): void {
    this.visitaModal.set(null);
    this.modalActivo.set(null);
    this.cargarVisitas();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  rowClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: '', en_camino: 'en-camino', en_sitio: 'en-sitio',
      en_proceso: 'en-proceso', obs_guardadas: 'obs', completo: 'completo'
    };
    return m[e];
  }

  badgeClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: 'badge-pendiente', en_camino: 'badge-en-camino',
      en_sitio: 'badge-en-sitio', en_proceso: 'badge-en-proceso',
      obs_guardadas: 'badge-obs', completo: 'badge-completo'
    };
    return m[e];
  }

  labelEstado(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: 'Pendiente', en_camino: 'En camino', en_sitio: 'En sitio',
      en_proceso: 'En proceso', obs_guardadas: 'Observaciones guardadas',
      completo: 'Completo'
    };
    return m[e];
  }

  nombreMes(n: number): string {
    return ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][n] ?? '';
  }
}