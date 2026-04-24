import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore, collection, collectionData,
  doc, setDoc, updateDoc,
  Timestamp, query, where, deleteDoc
} from '@angular/fire/firestore';
import {
  Auth, createUserWithEmailAndPassword
} from '@angular/fire/auth';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { VisitasService } from '../../core/services/visitas.service';
import { ObservacionesService } from '../../core/services/observaciones.service';
import { DocumentacionService } from '../../core/services/documentacion.service';
import { DialogService } from '../../core/services/dialog.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { Usuario } from '../../core/models/usuario.model';
import { Visita, EstadoVisita } from '../../core/models/visita.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, DialogComponent],
  template: `
    <app-navbar />

    <div class="admin-wrap">
      <div class="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestión de usuarios, visitas y configuración del sistema.</p>
      </div>

      <div class="tabs">
        <button class="tab-btn" [class.active]="tab() === 'usuarios'"
                (click)="tab.set('usuarios')">
          👥 Usuarios
        </button>
        <button class="tab-btn" [class.active]="tab() === 'visitas'"
                (click)="tab.set('visitas')">
          🔍 Visitas
        </button>
        <button class="tab-btn" [class.active]="tab() === 'sitios'"
                (click)="tab.set('sitios')">
          ➕ Gestión de sitios
        </button>
      </div>

      <!-- ── TAB USUARIOS ────────────────────────────────────────────── -->
      @if (tab() === 'usuarios') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Usuarios registrados</h3>
            <button class="btn btn-primary btn-sm"
                    (click)="mostrarFormNuevo.set(!mostrarFormNuevo())">
              {{ mostrarFormNuevo() ? '× Cancelar' : '+ Nuevo usuario' }}
            </button>
          </div>

          @if (mostrarFormNuevo()) {
            <div class="form-card mb-3">
              <h3 style="margin-bottom:16px">Crear nuevo usuario</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre completo</label>
                  <input [(ngModel)]="nuevoNombre" placeholder="Ej. Juan Pérez" />
                </div>
                <div class="form-group">
                  <label>Correo electrónico</label>
                  <input type="email" [(ngModel)]="nuevoCorreo"
                         placeholder="usuario@escom.com" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Contraseña temporal</label>
                  <input type="password" [(ngModel)]="nuevoPassword"
                         placeholder="Mínimo 6 caracteres" />
                </div>
                <div class="form-group">
                  <label>Rol</label>
                  <select [(ngModel)]="nuevoRol">
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              @if (errorUsuario()) {
                <div class="banner banner-danger mb-3">
                  <span>⚠</span> {{ errorUsuario() }}
                </div>
              }
              <div style="display:flex;justify-content:flex-end;gap:8px">
                <button class="btn btn-secondary"
                        (click)="mostrarFormNuevo.set(false)">
                  Cancelar
                </button>
                <button class="btn btn-primary"
                        [disabled]="creandoUsuario()"
                        (click)="crearUsuario()">
                  @if (creandoUsuario()) { <span class="spinner"></span> }
                  Crear usuario
                </button>
              </div>
            </div>
          }

          <div class="banner banner-warn mb-3">
            <span>⚠</span>
            Eliminar un usuario borra su acceso permanentemente.
            Sus registros históricos se conservan en el sistema.
          </div>

          @if (cargandoUsuarios()) {
            <div class="estado-carga">
              <span class="spinner"></span><span>Cargando usuarios...</span>
            </div>
          } @else {
            <table class="cal-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th style="text-align:center">Estado</th>
                  <th style="text-align:right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of usuarios(); track u.uid) {
                  <tr>
                    <td class="col-nombre">{{ u.nombre }}</td>
                    <td class="text-muted">{{ u.correo }}</td>
                    <td>
                      <span class="badge"
                            [class]="u.rol === 'admin'
                              ? 'badge-obs' : 'badge-pendiente'">
                        {{ u.rol === 'admin' ? 'Admin' : 'Técnico' }}
                      </span>
                    </td>
                    <td style="text-align:center">
                      <span class="badge"
                            [class]="u.activo
                              ? 'badge-completo' : 'badge-en-proceso'">
                        {{ u.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td style="text-align:right">
                      <div style="display:flex;gap:6px;justify-content:flex-end">
                        <button class="btn btn-sm"
                                [class]="u.activo ? 'btn-secondary' : 'btn-success'"
                                (click)="toggleActivo(u)">
                          {{ u.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon"
                                title="Eliminar usuario permanentemente"
                                (click)="eliminarUsuario(u)">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }

        </div>
      }

      <!-- ── TAB VISITAS ─────────────────────────────────────────────── -->
      @if (tab() === 'visitas') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Buscar y gestionar visitas</h3>
          </div>

          <div class="banner banner-warn mb-3">
            <span>⚠</span>
            Reabrir observaciones borra la documentación automáticamente.
            Regresar a pendiente borra todo.
          </div>

          <div class="filtros-row mb-3">
            <div class="form-group">
              <label>Tipo</label>
              <select [(ngModel)]="filtroTipo">
                <option value="poliza">Pólizas</option>
                <option value="cedis">CEDIS</option>
              </select>
            </div>
            <div class="form-group">
              <label>Año</label>
              <input type="number" [(ngModel)]="filtroAnio" [min]="2024" />
            </div>
            <div class="form-group">
              <label>Mes</label>
              <select [(ngModel)]="filtroMes">
                @for (m of meses; track m.num) {
                  <option [value]="m.num">{{ m.nombre }}</option>
                }
              </select>
            </div>
            <button class="btn btn-primary"
                    [disabled]="buscando()"
                    (click)="buscarVisitas()">
              @if (buscando()) { <span class="spinner"></span> }
              Buscar
            </button>
          </div>

          @if (visitasBusqueda().length > 0) {
            <div style="overflow-x:auto">
              <table class="cal-table">
                <thead>
                  <tr>
                    <th>Sitio</th>
                    <th>Técnico</th>
                    <th>Estado</th>
                    <th>Salida</th>
                    <th>Llegada</th>
                    <th>Término</th>
                    <th style="text-align:right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of visitasBusqueda(); track v.id) {
                    <tr [class]="'row-' + rowClass(v.estado)">
                      <td class="col-nombre">{{ v.sitioNombre }}</td>
                      <td class="text-muted" style="font-size:12px">
                        {{ v.tecnicoNombre || '—' }}
                      </td>
                      <td>
                        <span class="badge" [class]="badgeClass(v.estado)">
                          {{ labelEstado(v.estado) }}
                        </span>
                      </td>
                      <td class="text-muted">{{ fmtHora(v.horaSalida) }}</td>
                      <td class="text-muted">{{ fmtHora(v.horaLlegada) }}</td>
                      <td class="text-muted">{{ fmtHora(v.horaTermino) }}</td>
                      <td style="text-align:right">
                        <div class="col-acc-inner">
                          @if (v.estado === 'obs_guardadas' ||
                               v.estado === 'completo') {
                            <button class="btn btn-danger btn-sm"
                                    (click)="reabrirObs(v)">
                              🔓 Obs.
                            </button>
                          }
                          @if (v.estado === 'completo') {
                            <button class="btn btn-amber btn-sm"
                                    (click)="reabrirDoc(v)">
                              🔓 Doc.
                            </button>
                          }
                          @if (v.estado !== 'pendiente') {
                            <button class="btn btn-secondary btn-sm"
                                    (click)="regresarPendiente(v)">
                              ↩ Pendiente
                            </button>
                          }
                          <button class="btn btn-danger btn-sm btn-icon"
                                  title="Eliminar visita"
                                  (click)="eliminarVisita(v)">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (busquedaRealizada()) {
            <div class="estado-vacio">
              <span style="font-size:32px">🔍</span>
              <p>No se encontraron visitas con ese filtro.</p>
            </div>
          }

        </div>
      }

      <!-- ── TAB SITIOS ──────────────────────────────────────────────── -->
      @if (tab() === 'sitios') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Agregar sitio al mes</h3>
          </div>

          <div class="banner banner-info mb-3">
            <span>ℹ</span>
            Agrega un sitio extra a cualquier mes. Se insertará en la posición
            que indiques y los demás se recorrerán hacia abajo.
          </div>

          <div class="form-card">
            <div class="form-row">
              <div class="form-group">
                <label>Tipo</label>
                <select [(ngModel)]="nuevoSitioTipo">
                  <option value="poliza">Pólizas</option>
                  <option value="cedis">CEDIS</option>
                </select>
              </div>
              <div class="form-group">
                <label>Año</label>
                <input type="number" [(ngModel)]="nuevoSitioAnio" [min]="2024" />
              </div>
              <div class="form-group">
                <label>Mes</label>
                <select [(ngModel)]="nuevoSitioMes">
                  @for (m of meses; track m.num) {
                    <option [value]="m.num">{{ m.nombre }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Nombre del sitio</label>
                <input [(ngModel)]="nuevoSitioNombre"
                       placeholder="Ej. Nuevo Sitio Veracruz" />
              </div>
              <div class="form-group">
                <label>Posición en la lista</label>
                <input type="number" [(ngModel)]="nuevoSitioPos"
                       placeholder="Ej. 4" [min]="1" />
              </div>
            </div>
            @if (errorSitio()) {
              <div class="banner banner-danger mb-3">
                <span>⚠</span> {{ errorSitio() }}
              </div>
            }
            @if (exitoSitio()) {
              <div class="banner banner-lock mb-3">
                <span>✓</span> {{ exitoSitio() }}
              </div>
            }
            <div style="display:flex;justify-content:flex-end">
              <button class="btn btn-primary"
                      [disabled]="agregandoSitio()"
                      (click)="agregarSitio()">
                @if (agregandoSitio()) { <span class="spinner"></span> }
                Agregar sitio
              </button>
            </div>
          </div>

        </div>
      }

      <!-- Modal confirmar eliminar usuario -->
      @if (usuarioAEliminar()) {
        <div class="modal-backdrop" (click)="usuarioAEliminar.set(null)">
          <div class="modal-box modal-confirm"
               (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-title" style="color:#991B1B">
                ⚠ Eliminar usuario permanentemente
              </span>
            </div>
            <div class="modal-body">
              <div class="banner banner-danger mb-3">
                <span>🗑</span>
                Esta acción <strong>no se puede deshacer</strong>.
              </div>
              <p style="margin-bottom:12px;color:var(--gris-osc)">
                Estás a punto de eliminar permanentemente al usuario:
              </p>
              <div class="confirm-user-card">
                <div class="confirm-avatar">
                  {{ usuarioAEliminar()!.nombre.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div style="font-weight:600;color:var(--gris-osc)">
                    {{ usuarioAEliminar()!.nombre }}
                  </div>
                  <div class="text-muted">{{ usuarioAEliminar()!.correo }}</div>
                  <span class="badge"
                        [class]="usuarioAEliminar()!.rol === 'admin'
                          ? 'badge-obs' : 'badge-pendiente'"
                        style="margin-top:4px">
                    {{ usuarioAEliminar()!.rol === 'admin' ? 'Admin' : 'Técnico' }}
                  </span>
                </div>
              </div>
              <p class="text-muted" style="margin-top:12px;font-size:12px">
                Sus registros históricos se conservarán pero
                ya no podrá iniciar sesión.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary"
                      (click)="usuarioAEliminar.set(null)">
                Cancelar
              </button>
              <button class="btn btn-danger"
                      [disabled]="eliminandoUsuario()"
                      (click)="confirmarEliminarUsuario()">
                @if (eliminandoUsuario()) { <span class="spinner"></span> }
                Sí, eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      }

    </div>

    <app-dialog />
  `,
  styles: [`
    .admin-wrap    { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .admin-header  { margin-bottom: 28px; }
    .admin-header h1 { margin-bottom: 4px; }
    .tabs {
      display: flex; gap: 2px;
      border-bottom: 1px solid var(--gris-border);
      margin-bottom: 24px; overflow-x: auto;
    }
    .tab-btn {
      padding: 10px 20px; border: none; background: transparent;
      font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
      color: var(--gris-med); cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all var(--trans); white-space: nowrap;
      &:hover  { color: var(--azul-clar); }
      &.active { color: var(--azul-clar); border-bottom-color: var(--azul-clar); }
    }
    .section-header {
      display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 16px;
    }
    .form-card {
      background: #fff; border: 1px solid var(--gris-border);
      border-radius: var(--radius-lg); padding: 20px;
      margin-bottom: 20px; box-shadow: var(--shadow-xs);
    }
    .filtros-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px; align-items: flex-end;
    }
    .estado-carga {
      display: flex; justify-content: center; align-items: center;
      gap: 12px; padding: 40px; color: var(--gris-med);
    }
    .estado-vacio {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 40px; color: var(--gris-med); text-align: center;
    }
    .mb-3 { margin-bottom: 12px; }
    .modal-confirm { max-width: 420px; }
    .confirm-user-card {
      display: flex; align-items: center; gap: 14px;
      padding: 14px; background: var(--rojo-bg);
      border-radius: var(--radius-md); border: 1px solid var(--rojo-borde);
    }
    .confirm-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--rojo-osc); color: #fff;
      font-size: 18px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    @media (max-width: 768px) {
      .filtros-row { grid-template-columns: 1fr 1fr; }
      .admin-wrap  { padding: 76px 12px 24px; }
    }
    @media (max-width: 768px) {
      .filtros-row { grid-template-columns: 1fr 1fr; }
      .admin-wrap  { padding: 76px 12px 24px; }
      .col-acc-inner { flex-direction: column; }
      .cal-table th, .cal-table td { font-size: 11px; padding: 6px 4px; }
}
  `],
})
export class AdminComponent implements OnInit {
  private fs         = inject(Firestore);
  private fireAuth   = inject(Auth);
  private visitasSvc = inject(VisitasService);
  private obsSvc     = inject(ObservacionesService);
  private docSvc     = inject(DocumentacionService);
  private dialog     = inject(DialogService);

  tab               = signal<'usuarios' | 'visitas' | 'sitios'>('usuarios');
  usuarios          = signal<Usuario[]>([]);
  cargandoUsuarios  = signal(true);
  mostrarFormNuevo  = signal(false);
  creandoUsuario    = signal(false);
  errorUsuario      = signal('');

  usuarioAEliminar  = signal<Usuario | null>(null);
  eliminandoUsuario = signal(false);

  visitasBusqueda   = signal<Visita[]>([]);
  buscando          = signal(false);
  busquedaRealizada = signal(false);

  agregandoSitio   = signal(false);
  errorSitio       = signal('');
  exitoSitio       = signal('');
  nuevoSitioTipo   = 'poliza';
  nuevoSitioAnio   = new Date().getFullYear();
  nuevoSitioMes    = new Date().getMonth() + 1;
  nuevoSitioNombre = '';
  nuevoSitioPos    = 1;

  nuevoNombre   = '';
  nuevoCorreo   = '';
  nuevoPassword = '';
  nuevoRol: 'tecnico' | 'admin' = 'tecnico';

  filtroTipo = 'poliza';
  filtroAnio = new Date().getFullYear();
  filtroMes  = new Date().getMonth() + 1;

  meses = [
    { num:1,  nombre:'Enero' },     { num:2,  nombre:'Febrero' },
    { num:3,  nombre:'Marzo' },     { num:4,  nombre:'Abril' },
    { num:5,  nombre:'Mayo' },      { num:6,  nombre:'Junio' },
    { num:7,  nombre:'Julio' },     { num:8,  nombre:'Agosto' },
    { num:9,  nombre:'Septiembre' },{ num:10, nombre:'Octubre' },
    { num:11, nombre:'Noviembre' }, { num:12, nombre:'Diciembre' },
  ];

  private usuariosSub?: any;

  ngOnInit(): void { this.cargarUsuarios(); }

  private cargarUsuarios(): void {
    if (this.usuariosSub) this.usuariosSub.unsubscribe();
    const q = query(collection(this.fs, 'usuarios'));
    this.usuariosSub = (collectionData(q, { idField: 'uid' }) as any)
      .subscribe((us: Usuario[]) => {
        this.usuarios.set(us);
        this.cargandoUsuarios.set(false);
      });
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────
  async crearUsuario(): Promise<void> {
    if (!this.nuevoNombre || !this.nuevoCorreo || !this.nuevoPassword) {
      this.errorUsuario.set('Completa todos los campos.');
      return;
    }
    this.creandoUsuario.set(true);
    this.errorUsuario.set('');
    try {
      const cred = await createUserWithEmailAndPassword(
        this.fireAuth, this.nuevoCorreo, this.nuevoPassword
      );
      await setDoc(doc(this.fs, `usuarios/${cred.user.uid}`), {
        uid:      cred.user.uid,
        nombre:   this.nuevoNombre,
        correo:   this.nuevoCorreo,
        rol:      this.nuevoRol,
        activo:   true,
        creadoEn: Timestamp.now(),
      });
      this.nuevoNombre = '';
      this.nuevoCorreo = '';
      this.nuevoPassword = '';
      this.nuevoRol = 'tecnico';
      this.mostrarFormNuevo.set(false);
    } catch (e: any) {
      const msg = e?.code === 'auth/email-already-in-use'
        ? 'Ese correo ya está registrado.'
        : e?.message ?? 'Error al crear el usuario.';
      this.errorUsuario.set(msg);
    } finally {
      this.creandoUsuario.set(false);
    }
  }

  async toggleActivo(u: Usuario): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo:      u.activo ? 'warn' : 'success',
      icono:     u.activo ? '⏸' : '▶',
      titulo:    u.activo ? 'Desactivar usuario' : 'Activar usuario',
      mensaje:   `¿Confirmas ${u.activo ? 'desactivar' : 'activar'} a "${u.nombre}"?`,
      btnOk:     u.activo ? 'Sí, desactivar' : 'Sí, activar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await updateDoc(doc(this.fs, `usuarios/${u.uid}`), {
      activo:        !u.activo,
      actualizadoEn: Timestamp.now(),
    });
  }

  eliminarUsuario(u: Usuario): void {
    this.usuarioAEliminar.set(u);
  }

  async confirmarEliminarUsuario(): Promise<void> {
    const u = this.usuarioAEliminar();
    if (!u) return;
    this.eliminandoUsuario.set(true);
    try {
      await deleteDoc(doc(this.fs, `usuarios/${u.uid}`));
      this.usuarios.update(lista => lista.filter(x => x.uid !== u.uid));
      this.usuarioAEliminar.set(null);
    } catch (e: any) {
      await this.dialog.confirm({
        tipo: 'danger', icono: '❌',
        titulo:  'Error al eliminar',
        mensaje: 'No se pudo eliminar el usuario.',
        detalle: e.message,
        btnOk:   'Cerrar',
      });
    } finally {
      this.eliminandoUsuario.set(false);
    }
  }

  // ── Visitas ───────────────────────────────────────────────────────────────
  async buscarVisitas(): Promise<void> {
    this.buscando.set(true);
    this.busquedaRealizada.set(false);
    try {
      const q = query(
        collection(this.fs, 'visitas'),
        where('tipo', '==', this.filtroTipo),
        where('anio', '==', +this.filtroAnio),
        where('mes',  '==', +this.filtroMes),
      );
      (collectionData(q, { idField: 'id' }) as any)
        .subscribe((vs: Visita[]) => {
          this.visitasBusqueda.set(vs);
          this.busquedaRealizada.set(true);
          this.buscando.set(false);
        });
    } catch {
      this.buscando.set(false);
    }
  }

  async reabrirObs(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '🔓',
      titulo:    'Reabrir observaciones',
      mensaje:   `¿Reabrir observaciones de "${v.sitioNombre}"?`,
      detalle:   'La documentación se borrará automáticamente.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!);
  }

  async reabrirDoc(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'warn', icono: '🔓',
      titulo:    'Reabrir documentación',
      mensaje:   `¿Reabrir documentación de "${v.sitioNombre}"?`,
      detalle:   'Tendrán que volver a llenarla desde cero.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirDocumentacion(v.id!);
  }

  async regresarPendiente(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '⚠',
      titulo:    'Regresar a pendiente',
      mensaje:   `¿Regresar "${v.sitioNombre}" a pendiente?`,
      detalle:   'Se borrarán observaciones, documentación y horarios. Esta acción no se puede deshacer.',
      btnOk:     'Sí, regresar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!);
    await this.visitasSvc.regresarPendiente(v.id!);
  }

  async eliminarVisita(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '🗑',
      titulo:    'Eliminar visita',
      mensaje:   `¿Eliminar permanentemente "${v.sitioNombre}"?`,
      detalle:   'Esta acción no se puede deshacer. Se borrarán observaciones y documentación.',
      btnOk:     'Sí, eliminar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.eliminarVisita(v.id!);
    this.visitasBusqueda.update(vs => vs.filter(x => x.id !== v.id));
  }

  // ── Agregar sitio ─────────────────────────────────────────────────────────
  async agregarSitio(): Promise<void> {
    this.errorSitio.set('');
    this.exitoSitio.set('');
    if (!this.nuevoSitioNombre.trim()) {
      this.errorSitio.set('El nombre del sitio es obligatorio.');
      return;
    }
    this.agregandoSitio.set(true);
    try {
      const timestamp = Date.now();
      const id = `${this.nuevoSitioTipo}_${this.nuevoSitioAnio}_${this.nuevoSitioMes}_extra_${timestamp}`;
      await setDoc(doc(this.fs, `visitas/${id}`), {
        id,
        sitioId:       `extra_${timestamp}`,
        sitioNombre:   this.nuevoSitioNombre.trim(),
        tipo:          this.nuevoSitioTipo,
        mes:           +this.nuevoSitioMes,
        anio:          +this.nuevoSitioAnio,
        tecnicoId:     '',
        tecnicoNombre: '',
        estado:        'pendiente',
        posicion:      +this.nuevoSitioPos,
        esExtra:       true,
        horaSalida:    null,
        horaLlegada:   null,
        horaTermino:   null,
        creadoEn:      Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      });
      this.exitoSitio.set(
        `"${this.nuevoSitioNombre}" agregado al mes de ` +
        `${this.meses.find(m => m.num === +this.nuevoSitioMes)?.nombre} ${this.nuevoSitioAnio}.`
      );
      this.nuevoSitioNombre = '';
      this.nuevoSitioPos    = 1;
    } catch (e: any) {
      this.errorSitio.set('Error al agregar el sitio: ' + e.message);
    } finally {
      this.agregandoSitio.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  fmtHora(t: any): string {
    if (!t) return '—';
    const d = t?.toDate ? t.toDate() : new Date(t);
    return d.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  rowClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: '', en_camino: 'en-camino', en_sitio: 'en-sitio',
      en_proceso: 'en-proceso', obs_guardadas: 'obs', completo: 'completo'
    };
    return m[e] ?? '';
  }

  badgeClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: 'badge-pendiente', en_camino: 'badge-en-camino',
      en_sitio: 'badge-en-sitio', en_proceso: 'badge-en-proceso',
      obs_guardadas: 'badge-obs', completo: 'badge-completo'
    };
    return m[e] ?? '';
  }

  labelEstado(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente: 'Pendiente', en_camino: 'En camino', en_sitio: 'En sitio',
      en_proceso: 'En proceso', obs_guardadas: 'Obs. guardadas',
      completo: 'Completo'
    };
    return m[e] ?? e;
  }
}