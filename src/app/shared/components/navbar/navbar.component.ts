import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="navbar-brand">
        <span class="b-escom">ESCOM</span><span class="b-track">TRACK</span>
      </div>

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
        <!-- Selector de tema -->
        <div class="theme-btns">
          <button class="theme-btn" title="Gris"  (click)="setTema('')">☁</button>
          <button class="theme-btn" title="Oscuro" (click)="setTema('theme-dark')">🌙</button>
          <button class="theme-btn" title="Blanco" (click)="setTema('theme-white')">☀</button>
        </div>

        <div class="user-info">
          <span class="user-name">{{ auth.usuarioActual()?.nombre }}</span>
          <span class="user-rol"
                [class]="auth.esAdmin ? 'chip-admin' : 'chip-tec'">
            {{ auth.esAdmin ? 'Admin' : 'Técnico' }}
          </span>
        </div>
        <button class="logout-btn" (click)="auth.logout()">Salir</button>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      height: var(--navbar-h);
      background: var(--azul-osc);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 16px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 50;
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
    .chip-admin    {
      font-size: 10px; padding: 1px 8px; border-radius: 20px;
      background: rgba(253,224,71,.15); color: #FDE047;
      border: 1px solid rgba(253,224,71,.3);
    }
    .chip-tec      {
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
    }
    .logout-btn:hover { color: #fff; border-color: rgba(255,255,255,.4); background: rgba(255,255,255,.08); }

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
    }
    .theme-btn:hover { background: rgba(255,255,255,.1); color: #fff; }

    @media (max-width: 768px) {
      .navbar        { padding: 0 12px; gap: 8px; }
      .navbar-links  { display: none; }
      .b-escom, .b-track { font-size: 14px; }
      .user-name     { display: none; }
      .theme-btns    { display: none; }
    }
  `],
})
export class NavbarComponent implements OnInit {
  auth       = inject(AuthService);
  anioActual = new Date().getFullYear();

  ngOnInit(): void {
    const tema = localStorage.getItem('tema') ?? '';
    document.body.className = tema;
  }

  setTema(tema: string): void {
    document.body.className = tema;
    localStorage.setItem('tema', tema);
  }
}