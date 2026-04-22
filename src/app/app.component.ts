import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    @if (cargando) {
      <div class="app-loading">
        <div class="loading-inner">
          <span class="app-brand-lg"><b>ESCOM</b>TRACK</span>
          <span class="spinner"></span>
        </div>
      </div>
    } @else {
      <div class="app-shell">
        <router-outlet />
        <footer class="app-footer">
          © {{ anio }} RAGUI · ESCOM TRACK · Todos los derechos reservados
        </footer>
      </div>
    }
  `,
  styles: [`
    .app-loading {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--azul-osc);
    }
    .loading-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .app-brand-lg {
      font-size: 32px;
      color: rgba(255,255,255,.4);
      letter-spacing: .12em;
    }
    .app-brand-lg b { color: #fff; font-weight: 600; }
    .spinner {
      width: 28px; height: 28px;
      border: 2px solid rgba(255,255,255,.15);
      border-top-color: rgba(255,255,255,.7);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding-top: var(--navbar-h);
    }
    .app-footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--gris-med);
      border-top: 1px solid var(--gris-border);
      margin-top: auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AppComponent implements OnInit {
  cargando = true;
  anio     = new Date().getFullYear();

  private fireAuth = inject(Auth);
  private auth     = inject(AuthService);
  private router   = inject(Router);

  ngOnInit(): void {
    onAuthStateChanged(this.fireAuth, async (user) => {
      if (user) await this.esperarPerfil();
      this.cargando = false;
    });
  }

  private esperarPerfil(): Promise<void> {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (!this.auth.cargando()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }
}