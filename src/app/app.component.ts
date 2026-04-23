import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from './core/services/auth.service';
import { DialogComponent } from './shared/components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, DialogComponent],
  template: `
    @if (cargando) {
      <div class="app-loading">
        <div class="loading-inner">
          <span class="app-brand-lg"><b>ESCOM</b>TRACK</span>
          <span class="spinner"></span>
        </div>
      </div>
    } @else {
      <router-outlet />
      @if (mostrarFooter) {
        <footer class="app-footer">
          © {{ anio }} RAGUI · ESCOM TRACK · Todos los derechos reservados
        </footer>
      }
    }
    <app-dialog />
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
    .app-footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--gris-med);
      border-top: 1px solid var(--gris-border);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AppComponent implements OnInit {
  cargando     = true;
  mostrarFooter = false;
  anio         = new Date().getFullYear();

  private fireAuth = inject(Auth);
  private auth     = inject(AuthService);
  private router   = inject(Router);

  ngOnInit(): void {
    onAuthStateChanged(this.fireAuth, async (user) => {
      if (user) await this.esperarPerfil();
      this.cargando = false;
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.mostrarFooter = !e.url.includes('/login');
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