import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore, collection, collectionData,
  doc, setDoc, updateDoc,
  Timestamp, query, where, deleteDoc
} from '@angular/fire/firestore';
import {
  Auth, createUserWithEmailAndPassword,
  updatePassword, sendPasswordResetEmail
} from '@angular/fire/auth';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { VisitasService } from '../../core/services/visitas.service';
import { ObservacionesService } from '../../core/services/observaciones.service';
import { DocumentacionService } from '../../core/services/documentacion.service';
import { DialogService } from '../../core/services/dialog.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { AuthService } from '../../core/services/auth.service';
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
        @if (auth.esSuperAdmin) {
          <button class="tab-btn" [class.active]="tab() === 'perfil'"
                  (click)="tab.set('perfil')">
            👤 Mi perfil
          </button>
        }
      </div>

      <!-- ── TAB USUARIOS ────────────────────────────────────────────── -->
      @if (tab() === 'usuarios') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Usuarios registrados</h3>
            @if (auth.esAdmin) {
              <button class="btn btn-primary btn-sm"
                      (click)="mostrarFormNuevo.set(!mostrarFormNuevo())">
                {{ mostrarFormNuevo() ? '× Cancelar' : '+ Nuevo usuario' }}
              </button>
            }
          </div>

          @if (mostrarFormNuevo()) {
            <div class="form-card mb-3">
              <h3 style="margin-bottom:16px">Crear nuevo usuario</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre completo</label>
                  <input [(ngModel)]="nuevoNombre"
                         placeholder="Ej. Juan Pérez" />
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
                    @if (auth.esSuperAdmin) {
                      <option value="admin">Administrador</option>
                      <option value="superadmin">Super Administrador</option>
                    }
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

          @if (auth.esSoloAdmin) {
            <div class="banner banner-info mb-3">
              <span>ℹ</span>
              Como Administrador puedes activar/desactivar técnicos
              pero no eliminarlos ni ver al Super Administrador.
            </div>
          }
          @if (auth.esSuperAdmin) {
            <div class="banner banner-warn mb-3">
              <span>⚠</span>
              Eliminar un usuario borra su acceso permanentemente.
            </div>
          }

          @if (cargandoUsuarios()) {
            <div class="estado-carga">
              <span class="spinner"></span><span>Cargando usuarios...</span>
            </div>
          } @else {
            <table class="cal-table admin-table">
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
                @for (u of usuariosFiltrados(); track u.uid) {
                  <tr>
                    <td data-label="Nombre" class="col-nombre">
                      {{ u.nombre }}
                    </td>
                    <td data-label="Correo" class="text-muted">
                      {{ u.correo }}
                    </td>
                    <td data-label="Rol">
                      <span class="badge" [class]="badgeRol(u.rol)">
                        {{ labelRol(u.rol) }}
                      </span>
                    </td>
                    <td data-label="Estado" style="text-align:center">
                      <span class="badge"
                            [class]="u.activo
                              ? 'badge-completo' : 'badge-en-proceso'">
                        {{ u.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td data-label="Acciones" style="text-align:right">
                      <div style="display:flex;gap:6px;justify-content:flex-end;
                                  flex-wrap:wrap">
                        <button class="btn btn-sm"
                                [class]="u.activo ? 'btn-secondary' : 'btn-success'"
                                (click)="toggleActivo(u)">
                          {{ u.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                        @if (auth.esSuperAdmin) {
                          <button class="btn btn-secondary btn-sm btn-icon"
                                  title="Editar usuario"
                                  (click)="abrirEditar(u)">✏️</button>
                          <button class="btn btn-danger btn-sm btn-icon"
                                  title="Eliminar usuario"
                                  (click)="eliminarUsuario(u)">🗑</button>
                        }
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
              <table class="cal-table admin-table">
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
                      <td data-label="Sitio"   class="col-nombre">
                        {{ v.sitioNombre }}
                      </td>
                      <td data-label="Técnico" class="text-muted"
                          style="font-size:12px">
                        {{ v.tecnicoNombre || '—' }}
                      </td>
                      <td data-label="Estado">
                        <span class="badge" [class]="badgeClass(v.estado)">
                          {{ labelEstado(v.estado) }}
                        </span>
                      </td>
                      <td data-label="Salida"  class="text-muted">
                        {{ fmtHora(v.horaSalida) }}
                      </td>
                      <td data-label="Llegada" class="text-muted">
                        {{ fmtHora(v.horaLlegada) }}
                      </td>
                      <td data-label="Término" class="text-muted">
                        {{ fmtHora(v.horaTermino) }}
                      </td>
                      <td data-label="Acciones" style="text-align:right">
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
                          @if (auth.esSuperAdmin && v.estado !== 'completo') {
                            <button class="btn btn-success btn-sm"
                                    (click)="marcarCompletoDirecto(v)">
                              ✅ Completar
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
            Agrega un sitio extra a cualquier mes.
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
                <input type="number" [(ngModel)]="nuevoSitioAnio"
                       [min]="2024" />
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

      <!-- ── TAB PERFIL — solo superadmin ───────────────────────────── -->
      @if (tab() === 'perfil' && auth.esSuperAdmin) {
        <div class="tab-content">

          <div class="section-header">
            <h3>Mi perfil</h3>
          </div>

          <div class="form-card">
            <div class="form-row">
              <div class="form-group">
                <label>Nombre</label>
                <input [value]="auth.usuarioActual()?.nombre" disabled />
              </div>
              <div class="form-group">
                <label>Correo</label>
                <input [value]="auth.usuarioActual()?.correo" disabled />
              </div>
            </div>

            <div class="section-label" style="margin-top:8px">
              Cambiar contraseña
            </div>

<div class="form-row">
  <div class="form-group">
    <label>
      Nueva contraseña
      <span style="font-size:10px;color:var(--gris-med);font-weight:400">
        (se aplica cuando el usuario inicie sesión)
      </span>
    </label>
    <input type="password" [(ngModel)]="editPassword"
           placeholder="Mínimo 6 caracteres" />
  </div>
  <div class="form-group">
    <label>Rol</label>
    <select [(ngModel)]="editRol">
      <option value="tecnico">Técnico</option>
      <option value="admin">Administrador</option>
      <option value="superadmin">Super Administrador</option>
    </select>
  </div>
</div>

            @if (errorPwd()) {
              <div class="banner banner-danger mb-3">
                <span>⚠</span> {{ errorPwd() }}
              </div>
            }
            @if (exitoPwd()) {
              <div class="banner banner-lock mb-3">
                <span>✓</span> {{ exitoPwd() }}
              </div>
            }

            <div style="display:flex;justify-content:flex-end">
              <button class="btn btn-primary"
                      [disabled]="cambiandoPwd()"
                      (click)="cambiarPassword()">
                @if (cambiandoPwd()) { <span class="spinner"></span> }
                Actualizar contraseña
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
                        [class]="badgeRol(usuarioAEliminar()!.rol)"
                        style="margin-top:4px">
                    {{ labelRol(usuarioAEliminar()!.rol) }}
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

      <!-- Modal editar usuario -->
      @if (usuarioEditando()) {
        <div class="modal-backdrop" (click)="usuarioEditando.set(null)">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-title">✏️ Editar usuario</span>
              <button class="modal-close"
                      (click)="usuarioEditando.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre completo</label>
                  <input [(ngModel)]="editNombre" />
                </div>
                <div class="form-group">
                  <label>Correo electrónico</label>
                  <input type="email" [(ngModel)]="editCorreo" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>
                    Restablecer contraseña
                    <span style="font-size:10px;color:var(--gris-med);font-weight:400">
                      (escribe algo para enviar email de reset)
                    </span>
                  </label>
                  <input type="password" [(ngModel)]="editPassword"
                        placeholder="Escribe algo para enviar email de restablecimiento" />
                </div>
                <div class="form-group">
                  <label>Rol</label>
                  <select [(ngModel)]="editRol">
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Administrador</option>
                    <option value="superadmin">Super Administrador</option>
                  </select>
                </div>
              </div>

              @if (errorEditar()) {
                <div class="banner banner-danger">
                  <span>⚠</span> {{ errorEditar() }}
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary"
                      (click)="usuarioEditando.set(null)">
                Cancelar
              </button>
              <button class="btn btn-primary"
                      [disabled]="guardandoEditar()"
                      (click)="guardarEditar()">
                @if (guardandoEditar()) { <span class="spinner"></span> }
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal técnico para marcar completo -->
      @if (visitaCompletar()) {
        <div class="modal-backdrop" (click)="visitaCompletar.set(null)">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-title">✅ Marcar como completado</span>
              <button class="modal-close"
                      (click)="visitaCompletar.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="banner banner-warn mb-3">
                <span>⚠</span>
                Esta acción marca el sitio como completo sin
                observaciones ni documentación.
              </div>
              <p style="margin-bottom:8px;font-size:13px;color:var(--gris-osc)">
                Sitio: <strong>{{ visitaCompletar()!.sitioNombre }}</strong>
              </p>
              <div class="form-group">
                <label>Técnico responsable (obligatorio)</label>
                <select [(ngModel)]="tecnicoCompletar">
                  <option value="">— Selecciona técnico —</option>
                  @for (t of tecnicos(); track t.uid) {
                    <option [value]="t.nombre">{{ t.nombre }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary"
                      (click)="visitaCompletar.set(null)">
                Cancelar
              </button>
              <button class="btn btn-success"
                      [disabled]="!tecnicoCompletar || completando()"
                      (click)="confirmarCompletar()">
                @if (completando()) { <span class="spinner"></span> }
                Confirmar completado
              </button>
            </div>
          </div>
        </div>
      }

    </div>

    <app-dialog />
  `,
  styles: [`
    .admin-wrap    { max-width: 1100px; margin: 0 auto; padding: 80px 24px 32px; }
    .admin-header  { margin-bottom: 28px; }
    .admin-header h1 { margin-bottom: 4px; }
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
  `],
})
export class AdminComponent implements OnInit {
  private fs         = inject(Firestore);
  private fireAuth   = inject(Auth);
  private visitasSvc = inject(VisitasService);
  private obsSvc     = inject(ObservacionesService);
  private docSvc     = inject(DocumentacionService);
  private dialog     = inject(DialogService);
  auth               = inject(AuthService);

  tab = signal<'usuarios' | 'visitas' | 'sitios' | 'perfil'>('usuarios');

  // Usuarios
  usuarios          = signal<Usuario[]>([]);
  cargandoUsuarios  = signal(true);
  mostrarFormNuevo  = signal(false);
  creandoUsuario    = signal(false);
  errorUsuario      = signal('');

  // Eliminar
  usuarioAEliminar  = signal<Usuario | null>(null);
  eliminandoUsuario = signal(false);

  // Editar
  usuarioEditando   = signal<Usuario | null>(null);
  editNombre        = '';
  editCorreo        = '';
  editPassword      = '';
  editRol: 'superadmin' | 'admin' | 'tecnico' = 'tecnico';
  errorEditar       = signal('');
  guardandoEditar   = signal(false);

  // Completar directo
  visitaCompletar   = signal<Visita | null>(null);
  tecnicoCompletar  = '';
  completando       = signal(false);
  tecnicos          = signal<{ uid: string; nombre: string }[]>([]);

  // Visitas
  visitasBusqueda   = signal<Visita[]>([]);
  buscando          = signal(false);
  busquedaRealizada = signal(false);

  // Sitios
  agregandoSitio   = signal(false);
  errorSitio       = signal('');
  exitoSitio       = signal('');
  nuevoSitioTipo   = 'poliza';
  nuevoSitioAnio   = new Date().getFullYear();
  nuevoSitioMes    = new Date().getMonth() + 1;
  nuevoSitioNombre = '';
  nuevoSitioPos    = 1;

  // Nuevo usuario
  nuevoNombre   = '';
  nuevoCorreo   = '';
  nuevoPassword = '';
  nuevoRol: 'superadmin' | 'admin' | 'tecnico' = 'tecnico';

  // Filtros
  filtroTipo = 'poliza';
  filtroAnio = new Date().getFullYear();
  filtroMes  = new Date().getMonth() + 1;

  // Perfil / cambio contraseña
  nuevaPwd     = '';
  confirmarPwd = '';
  verPwd       = signal(false);
  verPwd2      = signal(false);
  errorPwd     = signal('');
  exitoPwd     = signal('');
  cambiandoPwd = signal(false);

  meses = [
    { num:1,  nombre:'Enero' },     { num:2,  nombre:'Febrero' },
    { num:3,  nombre:'Marzo' },     { num:4,  nombre:'Abril' },
    { num:5,  nombre:'Mayo' },      { num:6,  nombre:'Junio' },
    { num:7,  nombre:'Julio' },     { num:8,  nombre:'Agosto' },
    { num:9,  nombre:'Septiembre' },{ num:10, nombre:'Octubre' },
    { num:11, nombre:'Noviembre' }, { num:12, nombre:'Diciembre' },
  ];

  private usuariosSub?: any;

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarTecnicos();
  }

  private cargarUsuarios(): void {
    if (this.usuariosSub) this.usuariosSub.unsubscribe();
    const q = query(collection(this.fs, 'usuarios'));
    this.usuariosSub = (collectionData(q, { idField: 'uid' }) as any)
      .subscribe((us: Usuario[]) => {
        this.usuarios.set(us);
        this.cargandoUsuarios.set(false);
      });
  }

  private async cargarTecnicos(): Promise<void> {
    const q = query(
      collection(this.fs, 'usuarios'),
      where('activo', '==', true)
    );
    (collectionData(q, { idField: 'uid' }) as any)
      .subscribe((us: any[]) => {
        this.tecnicos.set(
          us.map(u => ({ uid: u.uid, nombre: u.nombre }))
        );
      });
  }

  usuariosFiltrados(): Usuario[] {
    const lista = this.usuarios();
    if (this.auth.esSuperAdmin) {
      return lista.filter(u => u.uid !== this.auth.usuarioActual()?.uid);
    }
    return lista.filter(u => u.rol !== 'superadmin');
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────
  async crearUsuario(): Promise<void> {
    if (!this.nuevoNombre || !this.nuevoCorreo || !this.nuevoPassword) {
      this.errorUsuario.set('Completa todos los campos.');
      return;
    }
    if (this.auth.esSoloAdmin && this.nuevoRol !== 'tecnico') {
      this.errorUsuario.set('Solo puedes crear técnicos.');
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
      this.nuevoNombre   = '';
      this.nuevoCorreo   = '';
      this.nuevoPassword = '';
      this.nuevoRol      = 'tecnico';
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
    if (this.auth.esSoloAdmin && u.rol === 'superadmin') return;
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

  abrirEditar(u: Usuario): void {
    this.usuarioEditando.set(u);
    this.editNombre   = u.nombre;
    this.editCorreo   = u.correo;
    this.editPassword = '';
    this.editRol      = u.rol;
    this.errorEditar.set('');
  }

  async guardarEditar(): Promise<void> {
    const u = this.usuarioEditando();
    if (!u) return;
    if (!this.editNombre || !this.editCorreo) {
      this.errorEditar.set('Nombre y correo son obligatorios.');
      return;
    }
    this.guardandoEditar.set(true);
    this.errorEditar.set('');
    try {
      const datos: any = {
        nombre:        this.editNombre,
        correo:        this.editCorreo,
        rol:           this.editRol,
        actualizadoEn: Timestamp.now(),
      };

      // Si escribió contraseña — guardarla en Firestore temporalmente
      // Se aplicará automáticamente cuando el usuario inicie sesión
      if (this.editPassword && this.editPassword.length >= 6) {
        datos.nuevaPassword = this.editPassword;
      } else if (this.editPassword && this.editPassword.length > 0) {
        this.errorEditar.set('La contraseña debe tener al menos 6 caracteres.');
        this.guardandoEditar.set(false);
        return;
      }

      await updateDoc(doc(this.fs, `usuarios/${u.uid}`), datos);

      if (this.editPassword && this.editPassword.length >= 6) {
        await this.dialog.confirm({
          tipo:  'success',
          icono: '🔐',
          titulo:  'Contraseña guardada',
          mensaje: `La próxima vez que "${this.editNombre}" inicie sesión, su contraseña se actualizará automáticamente a la nueva.`,
          detalle: `Comunícale al usuario su nueva contraseña personalmente.`,
          btnOk:   'Entendido',
        });
      }

      this.editPassword = '';
      this.usuarioEditando.set(null);
    } catch (e: any) {
      this.errorEditar.set(e.message ?? 'Error al guardar.');
    } finally {
      this.guardandoEditar.set(false);
    }
  }
  eliminarUsuario(u: Usuario): void {
    if (!this.auth.esSuperAdmin) return;
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

  // ── Perfil — cambiar contraseña ───────────────────────────────────────────
  async cambiarPassword(): Promise<void> {
    this.errorPwd.set('');
    this.exitoPwd.set('');

    if (!this.nuevaPwd) {
      this.errorPwd.set('Escribe la nueva contraseña.');
      return;
    }
    if (this.nuevaPwd.length < 6) {
      this.errorPwd.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.nuevaPwd !== this.confirmarPwd) {
      this.errorPwd.set('Las contraseñas no coinciden.');
      return;
    }

    const ok = await this.dialog.confirm({
      tipo: 'warn', icono: '🔐',
      titulo:    'Cambiar contraseña',
      mensaje:   '¿Confirmas cambiar tu contraseña?',
      btnOk:     'Sí, cambiar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;

    this.cambiandoPwd.set(true);
    try {
      const user = this.fireAuth.currentUser;
      if (!user) throw new Error('No hay sesión activa.');
      await updatePassword(user, this.nuevaPwd);
      this.nuevaPwd     = '';
      this.confirmarPwd = '';
      this.exitoPwd.set('Contraseña actualizada correctamente.');
    } catch (e: any) {
      const msg = e?.code === 'auth/requires-recent-login'
        ? 'Por seguridad debes cerrar sesión y volver a entrar antes de cambiar la contraseña.'
        : e?.message ?? 'Error al cambiar la contraseña.';
      this.errorPwd.set(msg);
    } finally {
      this.cambiandoPwd.set(false);
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
      detalle:   this.auth.esSuperAdmin
        ? 'Las observaciones se conservarán (Super Admin).'
        : 'La documentación se borrará automáticamente.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(
      v.id!, this.auth.esSuperAdmin
    );
  }

  async reabrirDoc(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'warn', icono: '🔓',
      titulo:    'Reabrir documentación',
      mensaje:   `¿Reabrir documentación de "${v.sitioNombre}"?`,
      detalle:   this.auth.esSuperAdmin
        ? 'La documentación se conservará (Super Admin).'
        : 'La documentación se borrará completamente.',
      btnOk:     'Sí, reabrir',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirDocumentacion(
      v.id!, this.auth.esSuperAdmin
    );
  }

  async regresarPendiente(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '⚠',
      titulo:    'Regresar a pendiente',
      mensaje:   `¿Regresar "${v.sitioNombre}" a pendiente?`,
      detalle:   'Se borrarán observaciones, documentación y horarios.',
      btnOk:     'Sí, regresar',
      btnCancel: 'Cancelar',
    });
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!, false);
    await this.visitasSvc.regresarPendiente(v.id!);
  }

  marcarCompletoDirecto(v: Visita): void {
    if (!this.auth.esSuperAdmin) return;
    this.visitaCompletar.set(v);
    this.tecnicoCompletar = '';
  }

  async confirmarCompletar(): Promise<void> {
    const v = this.visitaCompletar();
    if (!v || !this.tecnicoCompletar) return;
    this.completando.set(true);
    try {
      await updateDoc(doc(this.fs, `visitas/${v.id}`), {
        estado:              'completo',
        tecnicoNombre:       this.tecnicoCompletar,
        esCompletadoDirecto: true,
        actualizadoEn:       Timestamp.now(),
      });
      this.visitaCompletar.set(null);
      this.visitasBusqueda.update(vs =>
        vs.map(x => x.id === v.id
          ? { ...x, estado: 'completo' as EstadoVisita,
              tecnicoNombre: this.tecnicoCompletar,
              esCompletadoDirecto: true }
          : x
        )
      );
    } catch (e: any) {
      await this.dialog.confirm({
        tipo: 'danger', icono: '❌',
        titulo:  'Error',
        mensaje: e.message,
        btnOk:   'Cerrar',
      });
    } finally {
      this.completando.set(false);
    }
  }

  async eliminarVisita(v: Visita): Promise<void> {
    const ok = await this.dialog.confirm({
      tipo: 'danger', icono: '🗑',
      titulo:    'Eliminar visita',
      mensaje:   `¿Eliminar permanentemente "${v.sitioNombre}"?`,
      detalle:   'Esta acción no se puede deshacer.',
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

  badgeRol(rol: string): string {
    const m: Record<string, string> = {
      superadmin: 'badge-en-camino',
      admin:      'badge-obs',
      tecnico:    'badge-pendiente',
    };
    return m[rol] ?? 'badge-pendiente';
  }

  labelRol(rol: string): string {
    const m: Record<string, string> = {
      superadmin: '⭐ Super Admin',
      admin:      'Admin',
      tecnico:    'Técnico',
    };
    return m[rol] ?? rol;
  }

  rowClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente:'', en_camino:'en-camino', en_sitio:'en-sitio',
      en_proceso:'en-proceso', obs_guardadas:'obs', completo:'completo'
    };
    return m[e] ?? '';
  }

  badgeClass(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente:'badge-pendiente', en_camino:'badge-en-camino',
      en_sitio:'badge-en-sitio', en_proceso:'badge-en-proceso',
      obs_guardadas:'badge-obs', completo:'badge-completo'
    };
    return m[e] ?? '';
  }

  labelEstado(e: EstadoVisita): string {
    const m: Record<EstadoVisita, string> = {
      pendiente:'Pendiente', en_camino:'En camino', en_sitio:'En sitio',
      en_proceso:'En proceso', obs_guardadas:'Obs. guardadas',
      completo:'Completo'
    };
    return m[e] ?? e;
  }
}