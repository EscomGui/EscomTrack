import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, User
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth   = inject(Auth);
  private fs     = inject(Firestore);
  private router = inject(Router);

  usuarioActual = signal<Usuario | null>(null);
  cargando      = signal<boolean>(true);

  constructor() {
    onAuthStateChanged(this.auth, async (fireUser: User | null) => {
      if (fireUser) {
        const u = await this.cargarPerfil(fireUser.uid);
        this.usuarioActual.set(u);
        this.verificarSesionExpirada();
      } else {
        this.usuarioActual.set(null);
      }
      this.cargando.set(false);
    });
  }

  async login(correo: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, correo, password);
    const u    = await this.cargarPerfil(cred.user.uid);
    if (!u || !u.activo) {
      await signOut(this.auth);
      throw new Error('Usuario inactivo o sin perfil.');
    }
    this.usuarioActual.set(u);
    localStorage.setItem('login_time', Date.now().toString());
    this.router.navigate(['/dashboard']);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.usuarioActual.set(null);
    localStorage.removeItem('login_time');
    this.router.navigate(['/login']);
  }

  private async cargarPerfil(uid: string): Promise<Usuario | null> {
    const snap = await getDoc(doc(this.fs, `usuarios/${uid}`));
    return snap.exists() ? (snap.data() as Usuario) : null;
  }

  private verificarSesionExpirada(): void {
    const loginTime = localStorage.getItem('login_time');
    if (!loginTime) {
      localStorage.setItem('login_time', Date.now().toString());
      return;
    }
    const OCHO_HORAS = 8 * 60 * 60 * 1000;
    if (Date.now() - +loginTime > OCHO_HORAS) {
      this.logout();
    }
  }

  get esAdmin():   boolean { return this.usuarioActual()?.rol === 'admin'; }
  get esTecnico(): boolean { return this.usuarioActual()?.rol === 'tecnico'; }
}