import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore, collection, collectionData,
  doc, setDoc, updateDoc, Timestamp, query, where
} from '@angular/fire/firestore';
import {
  Auth, createUserWithEmailAndPassword
} from '@angular/fire/auth';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { VisitasService } from '../../core/services/visitas.service';
import { ObservacionesService } from '../../core/services/observaciones.service';
import { DocumentacionService } from '../../core/services/documentacion.service';
import { Usuario } from '../../core/models/usuario.model';
import { Visita } from '../../core/models/visita.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />

    <div class="admin-wrap">
      <div class="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestión de usuarios y control de visitas.</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn" [class.active]="tab() === 'usuarios'"
                (click)="tab.set('usuarios')">
          👥 Usuarios
        </button>
        <button class="tab-btn" [class.active]="tab() === 'visitas'"
                (click)="tab.set('visitas')">
          🔓 Reabrir visitas
        </button>
      </div>

      <!-- ── TAB USUARIOS ───────────────────────────────────────── -->
      @if (tab() === 'usuarios') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Usuarios registrados</h3>
            <button class="btn btn-primary btn-sm"
                    (click)="mostrarFormNuevo.set(!mostrarFormNuevo())">
              {{ mostrarFormNuevo() ? '× Cancelar' : '+ Nuevo usuario' }}
            </button>
          </div>

          <!-- Formulario nuevo usuario -->
          @if (mostrarFormNuevo()) {
            <div class="form-card">
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

          <!-- Lista de usuarios -->
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
                            [class]="u.rol === 'admin' ? 'badge-obs' : 'badge-pendiente'">
                        {{ u.rol === 'admin' ? 'Admin' : 'Técnico' }}
                      </span>
                    </td>
                    <td style="text-align:center">
                      <span class="badge"
                            [class]="u.activo ? 'badge-completo' : 'badge-en-proceso'">
                        {{ u.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td style="text-align:right">
                      <button class="btn btn-sm"
                              [class]="u.activo ? 'btn-danger' : 'btn-success'"
                              (click)="toggleActivo(u)">
                        {{ u.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }

        </div>
      }

      <!-- ── TAB REABRIR VISITAS ────────────────────────────────── -->
      @if (tab() === 'visitas') {
        <div class="tab-content">

          <div class="section-header">
            <h3>Buscar visita para reabrir</h3>
          </div>

          <div class="banner banner-warn mb-3">
            <span>⚠</span>
            Reabrir observaciones borrará la documentación automáticamente.
            Reabrir documentación solo borra la documentación.
          </div>

          <!-- Filtros de búsqueda -->
          <div class="filtros-row">
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

          <!-- Resultados -->
          @if (visitasBusqueda().length > 0) {
            <table class="cal-table" style="margin-top:16px">
              <thead>
                <tr>
                  <th>Sitio</th>
                  <th>Técnico</th>
                  <th>Estado</th>
                  <th style="text-align:right">Acciones admin</th>
                </tr>
              </thead>
              <tbody>
                @for (v of visitasBusqueda(); track v.id) {
                  <tr [class]="'row-' + rowClass(v.estado)">
                    <td class="col-nombre">{{ v.sitioNombre }}</td>
                    <td class="text-muted">{{ v.tecnicoNombre || '—' }}</td>
                    <td>
                      <span class="badge" [class]="badgeClass(v.estado)">
                        {{ labelEstado(v.estado) }}
                      </span>
                    </td>
                    <td style="text-align:right">
                      <div class="col-acc-inner">
                        @if (v.estado === 'obs_guardadas' || v.estado === 'completo') {
                          <button class="btn btn-danger btn-sm"
                                  (click)="reabrirObs(v)">
                            🔓 Reabrir obs.
                          </button>
                        }
                        @if (v.estado === 'completo') {
                          <button class="btn btn-amber btn-sm"
                                  (click)="reabrirDoc(v)">
                            🔓 Reabrir doc.
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else if (busquedaRealizada()) {
            <div class="estado-vacio">
              <span style="font-size:32px">🔍</span>
              <p>No se encontraron visitas con ese filtro.</p>
            </div>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    .admin-wrap    { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }
    .admin-header  { margin-bottom: 28px; }
    .admin-header h1 { margin-bottom: 4px; }

    .tabs {
      display: flex;
      gap: 2px;
      border-bottom: 1px solid var(--gris-border);
      margin-bottom: 24px;
    }
    .tab-btn {
      padding: 10px 20px;
      border: none;
      background: transparent;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--gris-med);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all var(--trans);
      &:hover { color: var(--azul-clar); }
      &.active { color: var(--azul-clar); border-bottom-color: var(--azul-clar); }
    }

    .tab-content { }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .form-card {
      background: #fff;
      border: 1px solid var(--gris-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-xs);
    }

    .filtros-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: flex-end;
    }

    .estado-carga {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: var(--gris-med);
    }

    .estado-vacio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 40px;
      color: var(--gris-med);
      text-align: center;
    }

    .mb-3 { margin-bottom: 12px; }
  `],
})
export class AdminComponent implements OnInit {
  private fs         = inject(Firestore);
  private fireAuth   = inject(Auth);
  private visitasSvc = inject(VisitasService);
  private obsSvc     = inject(ObservacionesService);
  private docSvc     = inject(DocumentacionService);

  // ── Estado ────────────────────────────────────────────────────────────────
  tab               = signal<'usuarios' | 'visitas'>('usuarios');
  usuarios          = signal<Usuario[]>([]);
  cargandoUsuarios  = signal(true);
  mostrarFormNuevo  = signal(false);
  creandoUsuario    = signal(false);
  errorUsuario      = signal('');

  visitasBusqueda   = signal<Visita[]>([]);
  buscando          = signal(false);
  busquedaRealizada = signal(false);

  // ── Formulario nuevo usuario ──────────────────────────────────────────────
  nuevoNombre   = '';
  nuevoCorreo   = '';
  nuevoPassword = '';
  nuevoRol: 'tecnico' | 'admin' = 'tecnico';

  // ── Filtros búsqueda ──────────────────────────────────────────────────────
  filtroTipo = 'poliza';
  filtroAnio = new Date().getFullYear();
  filtroMes  = new Date().getMonth() + 1;

  meses = [
    { num:1, nombre:'Enero' },     { num:2,  nombre:'Febrero' },
    { num:3, nombre:'Marzo' },     { num:4,  nombre:'Abril' },
    { num:5, nombre:'Mayo' },      { num:6,  nombre:'Junio' },
    { num:7, nombre:'Julio' },     { num:8,  nombre:'Agosto' },
    { num:9, nombre:'Septiembre'},  { num:10, nombre:'Octubre' },
    { num:11, nombre:'Noviembre'}, { num:12, nombre:'Diciembre' },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    const q = query(collection(this.fs, 'usuarios'));
    (collectionData(q, { idField: 'uid' }) as any).subscribe((us: Usuario[]) => {
      this.usuarios.set(us);
      this.cargandoUsuarios.set(false);
    });
  }

  // ── Crear usuario ─────────────────────────────────────────────────────────
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
      const usuario: Usuario = {
        uid:          cred.user.uid,
        nombre:       this.nuevoNombre,
        correo:       this.nuevoCorreo,
        rol:          this.nuevoRol,
        activo:       true,
        creadoEn:     new Date(),
      };
      await setDoc(doc(this.fs, `usuarios/${cred.user.uid}`), {
        ...usuario,
        creadoEn: Timestamp.now(),
      });
      this.nuevoNombre   = '';
      this.nuevoCorreo   = '';
      this.nuevoPassword = '';
      this.nuevoRol      = 'tecnico';
      this.mostrarFormNuevo.set(false);
    } catch (e: any) {
      const msg =
        e?.code === 'auth/email-already-in-use'
          ? 'Ese correo ya está registrado.'
          : e?.message ?? 'Error al crear el usuario.';
      this.errorUsuario.set(msg);
    } finally {
      this.creandoUsuario.set(false);
    }
  }

  // ── Toggle activo ─────────────────────────────────────────────────────────
  async toggleActivo(u: Usuario): Promise<void> {
    const ok = confirm(
      `¿Confirmas ${u.activo ? 'desactivar' : 'activar'} al usuario ${u.nombre}?`
    );
    if (!ok) return;
    await updateDoc(doc(this.fs, `usuarios/${u.uid}`), {
      activo:        !u.activo,
      actualizadoEn: Timestamp.now(),
    });
  }

  // ── Buscar visitas ────────────────────────────────────────────────────────
  async buscarVisitas(): Promise<void> {
    this.buscando.set(true);
    this.busquedaRealizada.set(false);
    try {
      const q = query(
        collection(this.fs, 'visitas'),
        where('tipo', '==', this.filtroTipo),
        where('anio', '==', this.filtroAnio),
        where('mes',  '==', this.filtroMes),
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

  // ── Reabrir ───────────────────────────────────────────────────────────────
  async reabrirObs(v: Visita): Promise<void> {
    const ok = confirm(
      `¿Reabrir observaciones de "${v.sitioNombre}"?\n` +
      `La documentación se borrará automáticamente.`
    );
    if (!ok) return;
    await this.visitasSvc.reabrirObservaciones(v.id!);
    await this.obsSvc.desbloquearObservaciones(v.id!);
    await this.buscarVisitas();
  }

  async reabrirDoc(v: Visita): Promise<void> {
    const ok = confirm(
      `¿Reabrir documentación de "${v.sitioNombre}"?`
    );
    if (!ok) return;
    await this.visitasSvc.reabrirDocumentacion(v.id!);
    await this.buscarVisitas();
  }

  // ── Helpers visuales ─────────────────────────────────────────────────────
  rowClass(e: string): string {
    const m: Record<string,string> = {
      pendiente:'', en_proceso:'en-proceso',
      obs_guardadas:'obs', completo:'completo'
    };
    return m[e] ?? '';
  }

  badgeClass(e: string): string {
    const m: Record<string,string> = {
      pendiente:'badge-pendiente', en_proceso:'badge-en-proceso',
      obs_guardadas:'badge-obs', completo:'badge-completo'
    };
    return m[e] ?? '';
  }

  labelEstado(e: string): string {
    const m: Record<string,string> = {
      pendiente:'Pendiente', en_proceso:'En proceso',
      obs_guardadas:'Observaciones guardadas', completo:'Completo'
    };
    return m[e] ?? e;
  }
}