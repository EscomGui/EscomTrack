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

      <!-- Hamburguesa (solo móvil) -->
      <button class="hamburger" (click)="menuAbierto.set(!menuAbierto())">
        <span [class]="menuAbierto() ? 'ham-x' : 'ham-bar'"></span>
      </button>

      <div class="navbar-brand">
        <span class="b-escom">ESCOM</span><span class="b-track">TRACK</span>
      </div>

      <!-- Links desktop -->
      <div class="navbar-links">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a [routerLink]="['/polizas', anioActual, 1]"
           routerLinkActive="active">Pólizas</a>
        <a [routerLink]="['/cedis', anioActual, 10]"
           routerLinkActive="active">CEDIS</a>
        @if (auth.esAdmin) {
          <a routerLink="/admin" routerLinkActive="active"
             class="link-admin">⚙ Admin</a>
        }
      </div>

      <div class="navbar-right">
        <!-- Selector de tema desktop -->
        <div class="theme-btns desktop-only">
          <button class="theme-btn" title="Gris"   (click)="setTema('')">☁</button>
          <button class="theme-btn" title="Oscuro"  (click)="setTema('theme-dark')">🌙</button>
          <button class="theme-btn" title="Blanco"  (click)="setTema('theme-white')">☀</button>
        </div>

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

    <!-- Overlay -->
    @if (menuAbierto()) {
      <div class="menu-overlay" (click)="menuAbierto.set(false)"></div>
    }

    <!-- Menú lateral móvil -->
    <div class="menu-lateral" [class.abierto]="menuAbierto()">

      <!-- Header del menú -->
      <div class="menu-header">
        <span class="menu-brand">
          <b>ESCOM</b>TRACK
        </span>
        <button class="menu-close" (click)="menuAbierto.set(false)">×</button>
      </div>

      <!-- Info usuario -->
      <div class="menu-user">
        <div class="menu-avatar">
          {{ inicial() }}
        </div>
        <div>
          <div class="menu-user-nombre">{{ auth.usuarioActual()?.nombre }}</div>
          <span class="user-rol"
                [class]="auth.esAdmin ? 'chip-admin' : 'chip-tec'">
            {{ auth.esAdmin ? 'Administrador' : 'Técnico' }}
          </span>
        </div>
      </div>

      <!-- Links del menú -->
      <nav class="menu-nav">
        <a class="menu-link"
           routerLink="/dashboard"
           routerLinkActive="menu-link-active"
           (click)="menuAbierto.set(false)">
          <span class="menu-ico">🏠</span> Dashboard
        </a>
        <a class="menu-link"
           [routerLink]="['/polizas', anioActual, 1]"
           routerLinkActive="menu-link-active"
           (click)="menuAbierto.set(false)">
          <span class="menu-ico">📋</span> Pólizas
        </a>
        <a class="menu-link"
           [routerLink]="['/cedis', anioActual, 10]"
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

      <!-- Selector de tema -->
      <div class="menu-section-label">Tema de color</div>
      <div class="menu-temas">
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === ''"
                (click)="setTema('')">
          <span class="tema-preview tema-gris"></span>
          Gris
        </button>
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === 'theme-dark'"
                (click)="setTema('theme-dark')">
          <span class="tema-preview tema-oscuro"></span>
          Oscuro
        </button>
        <button class="tema-btn"
                [class.tema-activo]="temaActual() === 'theme-white'"
                (click)="setTema('theme-white')">
          <span class="tema-preview tema-blanco"></span>
          Blanco
        </button>
      </div>

      <!-- Cerrar sesión -->
      <div class="menu-footer">
        <button class="btn btn-danger w-full" (click)="logout()">
          Cerrar sesión
        </button>
      </div>

    </div>
  `,
  styles: [`
    .hamburger { display: none; }
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
  auth       = inject(AuthService);
  anioActual = new Date().getFullYear();
  menuAbierto = signal(false);
  temaActual  = signal('');

  ngOnInit(): void {
    const tema = localStorage.getItem('tema') ?? '';
    document.body.className = tema;
    this.temaActual.set(tema);
  }

  setTema(tema: string): void {
    document.body.className = tema;
    localStorage.setItem('tema', tema);
    this.temaActual.set(tema);
  }

  inicial(): string {
    const nombre = this.auth.usuarioActual()?.nombre ?? '';
    return nombre.charAt(0).toUpperCase();
  }

  logout(): void {
    this.menuAbierto.set(false);
    this.auth.logout();
  }
}