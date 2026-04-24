import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <button class="hamburger" (click)="menuAbierto.set(!menuAbierto())">
        <span [class]="menuAbierto() ? 'ham-x' : 'ham-bar'"></span>
      </button>

      <div class="navbar-brand">
        <span class="b-escom">ESCOM</span><span class="b-track">TRACK</span>
      </div>

      <div class="navbar-links">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a [routerLink]="['/polizas', anioActual, mesActual]"
           routerLinkActive="active">Pólizas</a>
        <a [routerLink]="['/cedis', anioActual, mesActualCedis]"
           routerLinkActive="active">CEDIS</a>
        @if (auth.esAdmin) {
          <a routerLink="/admin" routerLinkActive="active"
             class="link-admin">⚙ Admin</a>
        }
      </div>

      <div class="navbar-right">
        <div class="theme-btns desktop-only">
          <button class="theme-btn" title="Gris"
                  (click)="setTema('')">☁</button>
          <button class="theme-btn" title="Oscuro"
                  (click)="setTema('theme-dark')">🌙</button>
          <button class="theme-btn" title="Blanco"
                  (click)="setTema('theme-white')">☀</button>
        </div>

        @if (mostrarInstalar()) {
          <button class="install-btn desktop-only" (click)="instalarApp()">
            📲 Instalar
          </button>
        }

        <div class="user-info">
          <span class="user-name">{{ auth.usuarioActual()?.nombre }}</span>
          <span class="user-rol"
                [class]="auth.esAdmin ? 'chip-admin' : 'chip-tec'">
            {{ auth.esAdmin ? 'Admin' : 'Técnico' }}
          </span>
        </div>

        <button class="logout-btn desktop-only" (click)="auth.logout()">
          Salir
        </button>
      </div>
    </nav>

    @if (menuAbierto()) {
      <div class="menu-overlay" (click)="menuAbierto.set(false)"></div>
    }

    <div class="menu-lateral" [class.abierto]="menuAbierto()">

      <div class="menu-header">
        <span class="menu-brand"><b>ESCOM</b>TRACK</span>
        <button class="menu-close" (click)="menuAbierto.set(false)">×</button>
      </div>

      <div class="menu-user">
        <div class="menu-avatar">{{ inicial() }}</div>
        <div>
          <div class="menu-user-nombre">{{ auth.usuarioActual()?.nombre }}</div>
          <span class="user-rol"
                [class]="auth.esAdmin ? 'chip-admin' : 'chip-tec'">
            {{ auth.esAdmin ? 'Administrador' : 'Técnico' }}
          </span>
        </div>
      </div>

      <nav class="menu-nav">
        <a class="menu-link" routerLink="/dashboard"
           routerLinkActive="menu-link-active"
           (click)="menuAbierto.set(false)">
          <span class="menu-ico">🏠</span> Dashboard
        </a>
        <a class="menu-link"
           [routerLink]="['/polizas', anioActual, mesActual]"
           routerLinkActive="menu-link-active"
           (click)="menuAbierto.set(false)">
          <span class="menu-ico">📋</span> Pólizas
        </a>
        <a class="menu-link"
           [routerLink]="['/cedis', anioActual, mesActualCedis]"
           routerLinkActive="menu-link-active"
           (click)="menuAbierto.set(false)">
          <span class="menu-ico">🏭</span> CEDIS
        </a>
        @if (auth.esAdmin) {
          <a class="menu-link menu-link-admin"
             routerLink="/admin"
             routerLinkActive="menu-link-active"
             (click)="menuAbierto.set(false)">
            <span class="menu-ico">⚙</span> Administración
          </a>
        }
      </nav>

      <div class="menu-section-label">Tema de color</div>
      <div class="menu-temas">
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === ''"
                (click)="setTema('')">
          <span class="tema-preview tema-gris"></span>Gris
        </button>
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === 'theme-dark'"
                (click)="setTema('theme-dark')">
          <span class="tema-preview tema-oscuro"></span>Oscuro
        </button>
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === 'theme-white'"
                (click)="setTema('theme-white')">
          <span class="tema-preview tema-blanco"></span>Blanco
        </button>
      </div>

      @if (mostrarInstalar()) {
        <div style="padding: 0 20px 12px">
          <button class="btn btn-primary w-full" (click)="instalarApp()">
            📲 Instalar aplicación
          </button>
        </div>
      }

      <div class="menu-footer">
        <button class="btn btn-danger w-full" (click)="logout()">
          Cerrar sesión
        </button>
      </div>

    </div>
  `,
  styles: [`
    .hamburger    { display: none; }
    .install-btn {
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,.3);
      background: rgba(255,255,255,.1);
      color: #fff; font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer; transition: all var(--trans);
      &:hover { background: rgba(255,255,255,.2); }
    }
    @media (max-width: 768px) {
      .hamburger    { display: flex; }
      .navbar-links { display: none; }
      .desktop-only { display: none; }
      .user-name    { display: none; }
      .navbar       { padding: 0 12px; gap: 10px; }
    }
  `],
})
export class NavbarComponent implements OnInit {
  auth = inject(AuthService);

  anioActual     = new Date().getFullYear();
  mesActual      = new Date().getMonth() + 1;
  mesActualCedis = (() => {
    // Ciclo CEDIS empieza en octubre
    const m = new Date().getMonth() + 1;
    return m >= 10 ? m : 10;
  })();

  menuAbierto     = signal(false);
  temaActual      = signal('');
  mostrarInstalar = signal(false);
  deferredPrompt: any = null;

  ngOnInit(): void {
    const tema = localStorage.getItem('tema') ?? '';
    document.body.className = tema;
    this.temaActual.set(tema);

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.mostrarInstalar.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.mostrarInstalar.set(false);
      this.deferredPrompt = null;
    });
  }

  setTema(tema: string): void {
    document.body.className = tema;
    localStorage.setItem('tema', tema);
    this.temaActual.set(tema);
  }

  inicial(): string {
    return (this.auth.usuarioActual()?.nombre ?? '').charAt(0).toUpperCase();
  }

  async instalarApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') this.mostrarInstalar.set(false);
    this.deferredPrompt = null;
  }

  logout(): void {
    this.menuAbierto.set(false);
    this.auth.logout();
  }
}