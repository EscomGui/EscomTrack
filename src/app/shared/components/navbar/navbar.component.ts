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
    /* ── Navbar ─────────────────────────────────────────────────────────── */
    .navbar {
      height: var(--navbar-h);
      background: var(--azul-osc);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 16px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      box-shadow: 0 2px 12px rgba(0,0,0,.25);
    }

    .navbar-brand   { display: flex; align-items: baseline; gap: 1px; flex-shrink: 0; }
    .b-escom        { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: .08em; }
    .b-track        { font-size: 17px; font-weight: 300; color: rgba(255,255,255,.4); letter-spacing: .08em; }

    .navbar-links   { display: flex; gap: 2px; flex: 1; }
    .navbar-links a {
      padding: 6px 13px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,.55);
      text-decoration: none;
      transition: all var(--trans);
    }
    .navbar-links a:hover  { color: #fff; background: rgba(255,255,255,.08); }
    .navbar-links a.active { color: #fff; background: rgba(255,255,255,.13); }
    .link-admin            { color: rgba(253,224,71,.75) !important; }
    .link-admin:hover,
    .link-admin.active     { color: #FDE047 !important; background: rgba(253,224,71,.1) !important; }

    .navbar-right  { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .user-info     { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .user-name     { font-size: 13px; font-weight: 500; color: #fff; }

    .chip-admin {
      font-size: 10px; padding: 1px 8px; border-radius: 20px;
      background: rgba(253,224,71,.15); color: #FDE047;
      border: 1px solid rgba(253,224,71,.3);
    }
    .chip-tec {
      font-size: 10px; padding: 1px 8px; border-radius: 20px;
      background: rgba(255,255,255,.08); color: rgba(255,255,255,.45);
      border: 1px solid rgba(255,255,255,.15);
    }

    .logout-btn {
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,.2);
      background: transparent;
      color: rgba(255,255,255,.5);
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all var(--trans);
      &:hover { color: #fff; border-color: rgba(255,255,255,.4); background: rgba(255,255,255,.08); }
    }

    .theme-btns { display: flex; gap: 4px; }
    .theme-btn  {
      background: transparent;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: var(--radius-sm);
      color: rgba(255,255,255,.6);
      cursor: pointer;
      padding: 4px 7px;
      font-size: 12px;
      transition: all var(--trans);
      line-height: 1;
      &:hover { background: rgba(255,255,255,.1); color: #fff; }
    }

    /* ── Hamburguesa ────────────────────────────────────────────────────── */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 36px; height: 36px;
      background: transparent;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: var(--radius-sm);
      cursor: pointer;
      padding: 0;
      gap: 5px;
      flex-shrink: 0;
    }

    .ham-bar {
      display: block;
      width: 18px; height: 2px;
      background: rgba(255,255,255,.7);
      border-radius: 2px;
      transition: all var(--trans);
      box-shadow: 0 5px 0 rgba(255,255,255,.7), 0 -5px 0 rgba(255,255,255,.7);
    }

    .ham-x {
      display: block;
      width: 18px; height: 2px;
      background: transparent;
      border-radius: 2px;
      position: relative;
      &::before, &::after {
        content: '';
        position: absolute;
        width: 18px; height: 2px;
        background: rgba(255,255,255,.7);
        border-radius: 2px;
        top: 0;
      }
      &::before { transform: rotate(45deg); }
      &::after  { transform: rotate(-45deg); }
    }

    /* ── Overlay ────────────────────────────────────────────────────────── */
    .menu-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.5);
      z-index: 290;
      animation: fadeIn 200ms ease;
    }

    /* ── Menú lateral ───────────────────────────────────────────────────── */
    .menu-lateral {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 280px;
      background: var(--azul-osc);
      z-index: 300;
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 280ms cubic-bezier(.4,0,.2,1);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;

      &.abierto { transform: translateX(0); }
    }

    .menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      flex-shrink: 0;
    }

    .menu-brand {
      font-size: 18px;
      color: rgba(255,255,255,.4);
      letter-spacing: .08em;
      b { color: #fff; font-weight: 600; }
    }

    .menu-close {
      width: 30px; height: 30px;
      background: rgba(255,255,255,.08);
      border: none;
      border-radius: var(--radius-sm);
      color: rgba(255,255,255,.6);
      font-size: 20px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all var(--trans);
      &:hover { background: rgba(255,255,255,.15); color: #fff; }
    }

    .menu-user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      flex-shrink: 0;
    }

    .menu-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--azul-clar);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .menu-user-nombre {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      margin-bottom: 4px;
    }

    .menu-nav {
      flex: 1;
      padding: 12px 0;
    }

    .menu-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 20px;
      color: rgba(255,255,255,.6);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all var(--trans);
      border-left: 3px solid transparent;
      -webkit-tap-highlight-color: transparent;

      &:hover { background: rgba(255,255,255,.06); color: #fff; }
      &.menu-link-active {
        background: rgba(255,255,255,.1);
        color: #fff;
        border-left-color: var(--azul-clar);
      }
    }

    .menu-link-admin { color: rgba(253,224,71,.7) !important;
      &.menu-link-active { border-left-color: #FDE047; color: #FDE047 !important; }
    }

    .menu-ico { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }

    .menu-section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,.3);
      padding: 16px 20px 8px;
      border-top: 1px solid rgba(255,255,255,.08);
    }

    .menu-temas {
      display: flex;
      gap: 8px;
      padding: 0 20px 16px;
    }

    .tema-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 8px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: var(--radius-md);
      color: rgba(255,255,255,.5);
      font-size: 11px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all var(--trans);
      -webkit-tap-highlight-color: transparent;

      &:hover   { background: rgba(255,255,255,.1); color: #fff; }
      &.tema-activo {
        border-color: var(--azul-clar);
        background: rgba(46,109,180,.2);
        color: #fff;
      }
    }

    .tema-preview {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.2);
      display: block;
    }

    .tema-gris   { background: #F3F4F6; }
    .tema-oscuro { background: #0f0f0f; }
    .tema-blanco { background: #ffffff; }

    .menu-footer {
      padding: 16px 20px 32px;
      border-top: 1px solid rgba(255,255,255,.08);
      flex-shrink: 0;
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .hamburger   { display: flex; }
      .navbar-links { display: none; }
      .desktop-only { display: none; }
      .user-name   { display: none; }
      .navbar      { padding: 0 12px; gap: 10px; }
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