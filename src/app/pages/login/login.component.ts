import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrap">

      <div class="login-left">
        <div class="brand">
          <span class="b-escom">ESCOM</span><span class="b-track">TRACK</span>
        </div>
        <p class="tagline">
          Sistema de seguimiento, evidencia y reportes para sitios
          CEDIS y Pólizas de Granjas.
        </p>
        <div class="features">
          <div class="feat"><span class="feat-ico">📋</span>Pólizas de Granjas</div>
          <div class="feat"><span class="feat-ico">🏭</span>CEDIS</div>
          <div class="feat"><span class="feat-ico">📸</span>Evidencia fotográfica</div>
          <div class="feat"><span class="feat-ico">📄</span>Generación de reportes</div>
        </div>
        <div class="cliente">© RAGUI – Sistemas ESCOM</div>
      </div>

      <div class="login-right" style="--login-bg: url('/assets/login-bg.jpg')">
        <div class="login-card">
          <h2>Iniciar sesión</h2>
          <p class="login-sub">Ingresa con tus credenciales asignadas.</p>

          @if (error()) {
            <div class="banner banner-danger" style="margin-bottom:16px">
              <span>⚠</span> {{ error() }}
            </div>
          }

          <form (ngSubmit)="onLogin()">
            <div class="form-group">
              <label>Correo electrónico</label>
              <input
                type="email"
                [(ngModel)]="correo"
                name="correo"
                placeholder="usuario@escom.com"
                required
                [disabled]="cargando()"
              />
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <div class="input-pwd">
                <input
                  [type]="mostrarPwd ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  [disabled]="cargando()"
                />
                <button type="button"
                        class="pwd-toggle"
                        (click)="mostrarPwd = !mostrarPwd">
                  {{ mostrarPwd ? '👁️‍🗨️' : '👁' }}
                </button>
              </div>
            </div>
            <button
              type="submit"
              class="btn btn-primary w-full btn-lg"
              [disabled]="cargando()"
            >
              @if (cargando()) {
                <span class="spinner"></span> Ingresando...
              } @else {
                Ingresar al sistema
              }
            </button>
          </form>
        </div>
        <p class="login-footer">© RAGUI – Sistemas ESCOM · {{ anio }}</p>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .login-wrap {
      height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    /* Panel izquierdo */
    .login-left {
      background: var(--azul-osc);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 64px 56px;
    }
    .brand        { display: flex; align-items: baseline; gap: 2px; margin-bottom: 22px; }
    .b-escom      { font-size: 42px; font-weight: 600; color: #fff; letter-spacing: .1em; }
    .b-track      { font-size: 42px; font-weight: 300; color: rgba(255,255,255,.35); letter-spacing: .1em; }
    .tagline      { font-size: 15px; color: rgba(255,255,255,.6); line-height: 1.7; max-width: 380px; margin-bottom: 36px; }
    .features     { display: flex; flex-direction: column; gap: 12px; margin-bottom: 48px; }
    .feat         { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,.7); }
    .feat-ico     { font-size: 16px; width: 24px; }
    .cliente      { font-size: 12px; color: rgba(255,255,255,.3); margin-top: auto; }

    /* Panel derecho */
    .login-right {
      background: var(--gris-bg);
      background-image: var(--login-bg, none);
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 64px 40px;
      position: relative;
    }

    .login-right::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,.15);
      backdrop-filter: blur(1px);
    }

    .login-card {
      background: #fff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--gris-border);
      box-shadow: var(--shadow-md);
      padding: 36px 32px;
      width: 100%;
      max-width: 380px;
      position: relative;
      z-index: 1;
    }
    .login-card h2  { font-size: 22px; margin-bottom: 6px; }
    .login-sub      { font-size: 13px; color: var(--gris-med); margin-bottom: 24px; }
    .login-footer   {
      font-size: 11px; color: var(--gris-med);
      margin-top: 24px; text-align: center;
      position: relative; z-index: 1;
    }

    /* Input con ojo */
    .input-pwd {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-pwd input { padding-right: 40px; }
    .pwd-toggle {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      line-height: 1;
      color: var(--gris-med);
      transition: color var(--trans);
      &:hover { color: var(--gris-osc); }
    }

    @media (max-width: 768px) {
      .login-wrap { grid-template-columns: 1fr; }
      .login-left { display: none; }
      .login-right { padding: 40px 24px; }
    }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);

  correo     = '';
  password   = '';
  mostrarPwd = false;
  anio       = new Date().getFullYear();
  cargando   = signal(false);
  error      = signal('');

  async onLogin(): Promise<void> {
    if (!navigator.onLine) {
      this.error.set(
        'Sin conexión a internet. Conéctate para iniciar sesión.'
      );
      return;
    }
    if (!this.correo || !this.password) return;
    this.cargando.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.correo, this.password);
    } catch (e: any) {
      const msg =
        e?.code === 'auth/invalid-credential'
          ? 'Correo o contraseña incorrectos.'
          : e?.code === 'auth/network-request-failed'
            ? 'Sin conexión a internet. Verifica tu red.'
            : e?.message || 'Error al iniciar sesión.';
      this.error.set(msg);
    } finally {
      this.cargando.set(false);
    }
  }
}