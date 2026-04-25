import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, User,
  browserLocalPersistence, setPersistence,
  updatePassword
} from '@angular/fire/auth';
import {
  Firestore, doc, getDoc, updateDoc,
  onSnapshot, setDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth   = inject(Auth);
  private fs     = inject(Firestore);
  private router = inject(Router);

  usuarioActual = signal<Usuario | null>(null);
  cargando      = signal<boolean>(true);

  private inactividadTimer?: any;
  private readonly INACTIVIDAD_MS = 30 * 60 * 1000; // 30 minutos
  private eventListeners: (() => void)[] = [];

  constructor() {
    setPersistence(this.auth, browserLocalPersistence)
      .catch(() => {})
      .finally(() => {
        onAuthStateChanged(this.auth, async (fireUser: User | null) => {
          if (fireUser) {
            const u = await this.cargarPerfil(fireUser.uid);
            this.usuarioActual.set(u);
            this.verificarSesionExpirada();
            this.escucharConfigSistema();
          } else {
            this.usuarioActual.set(null);
            this.detenerTimerInactividad();
          }
          this.cargando.set(false);
        });
      });
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(correo: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(
      this.auth, correo, password
    );
    const u = await this.cargarPerfil(cred.user.uid);
    if (!u || !u.activo) {
      await signOut(this.auth);
      throw new Error('Usuario inactivo o sin perfil.');
    }

    // Si el superadmin asignó una nueva contraseña — actualizarla ahora
    if ((u as any).nuevaPassword) {
      try {
        await updatePassword(cred.user, (u as any).nuevaPassword);
        await updateDoc(doc(this.fs, `usuarios/${cred.user.uid}`), {
          nuevaPassword: null
        });
      } catch (e) {
        console.warn('No se pudo actualizar la contraseña:', e);
      }
    }

    this.usuarioActual.set(u);
    localStorage.setItem('login_time', Date.now().toString());
    localStorage.setItem('ultimo_movimiento', Date.now().toString());
    this.router.navigate(['/dashboard']);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    this.detenerTimerInactividad();
    await signOut(this.auth);
    this.usuarioActual.set(null);
    localStorage.removeItem('login_time');
    localStorage.removeItem('ultimo_movimiento');
    this.router.navigate(['/login']);
  }

  // ── Perfil ────────────────────────────────────────────────────────────────
  private async cargarPerfil(uid: string): Promise<Usuario | null> {
    const snap = await getDoc(doc(this.fs, `usuarios/${uid}`));
    return snap.exists() ? (snap.data() as Usuario) : null;
  }

  // ── Inactividad ───────────────────────────────────────────────────────────
  private iniciarTimerInactividad(): void {
    this.detenerTimerInactividad();

    const reiniciar = () => {
      localStorage.setItem('ultimo_movimiento', Date.now().toString());
      this.detenerTimerInactividad();
      this.inactividadTimer = setTimeout(() => {
        const usuario = this.usuarioActual();
        // SuperAdmin nunca expira por inactividad
        if (usuario && usuario.rol !== 'superadmin') {
          this.logout();
        }
      }, this.INACTIVIDAD_MS);
    };

    // Limpia listeners anteriores
    this.eventListeners.forEach(fn => fn());
    this.eventListeners = [];

    const eventos = ['mousemove','keydown','click','touchstart','scroll'];
    eventos.forEach(ev => {
      const handler = () => reiniciar();
      window.addEventListener(ev, handler, { passive: true });
      this.eventListeners.push(
        () => window.removeEventListener(ev, handler)
      );
    });

    reiniciar();
  }

  private detenerTimerInactividad(): void {
    if (this.inactividadTimer) {
      clearTimeout(this.inactividadTimer);
      this.inactividadTimer = undefined;
    }
    this.eventListeners.forEach(fn => fn());
    this.eventListeners = [];
  }

  private verificarSesionExpirada(): void {
    const ultimoMov = localStorage.getItem('ultimo_movimiento');
    if (ultimoMov) {
      const diff = Date.now() - +ultimoMov;
      if (diff > this.INACTIVIDAD_MS) {
        const usuario = this.usuarioActual();
        if (usuario?.rol !== 'superadmin') {
          this.logout();
          return;
        }
      }
    }
    this.iniciarTimerInactividad();
  }

  // ── Escuchar cierre masivo de sesiones ────────────────────────────────────
  private escucharConfigSistema(): void {
    onSnapshot(doc(this.fs, 'config/sistema'), async (snap) => {
      if (!snap.exists()) return;
      const config = snap.data();
      if (config['cerrarSesionTodos']) {
        const usuario = this.usuarioActual();
        if (usuario && usuario.rol !== 'superadmin') {
          await this.logout();
        }
      }
    });
  }

  // ── Getters de rol ────────────────────────────────────────────────────────
  get esSuperAdmin(): boolean {
    return this.usuarioActual()?.rol === 'superadmin';
  }

  get esAdmin(): boolean {
    return this.usuarioActual()?.rol === 'admin' ||
           this.usuarioActual()?.rol === 'superadmin';
  }

  get esSoloAdmin(): boolean {
    return this.usuarioActual()?.rol === 'admin';
  }

  get esTecnico(): boolean {
    return this.usuarioActual()?.rol === 'tecnico';
  }

  get rolActual(): 'superadmin' | 'admin' | 'tecnico' | null {
    return this.usuarioActual()?.rol ?? null;
  }
}