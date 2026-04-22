import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />

    <div class="dash-wrap">

      <div class="dash-header">
        <div>
          <h1>Bienvenido, {{ auth.usuarioActual()?.nombre }}</h1>
          <p>Selecciona el módulo y el período que deseas gestionar.</p>
        </div>
        <div class="anio-ctrl">
          <button class="btn btn-secondary btn-sm" (click)="cambiarAnio(-1)">‹</button>
          <span class="anio-val">{{ anio() }}</span>
          <button class="btn btn-secondary btn-sm" (click)="cambiarAnio(1)">›</button>
        </div>
      </div>

      <div class="modulos-grid">

        <!-- Pólizas -->
        <div class="modulo-card">
          <div class="mod-header poliza">
            <span class="mod-ico">📋</span>
            <div>
              <div class="mod-titulo">Pólizas de Granjas</div>
              <div class="mod-sub">Ciclo enero — diciembre · 28 sitios / mes</div>
            </div>
          </div>
          <div class="meses-grid">
            @for (m of mesesPoliza; track m.num) {
              <button class="mes-btn" (click)="ir('polizas', m.num)">
                <span class="mes-nombre">{{ m.nombre }}</span>
                <span class="mes-detalle">Grupo {{ m.grupo }}</span>
              </button>
            }
          </div>
        </div>

        <!-- CEDIS -->
        <div class="modulo-card">
          <div class="mod-header cedis">
            <span class="mod-ico">🏭</span>
            <div>
              <div class="mod-titulo">CEDIS</div>
              <div class="mod-sub">Ciclo oct — sep · ~46 sitios</div>
            </div>
          </div>
          <div class="meses-grid">
            @for (m of mesesCedis; track m.num) {
              <button class="mes-btn" (click)="ir('cedis', m.num)">
                <span class="mes-nombre">{{ m.nombre }}</span>
              </button>
            }
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dash-wrap     { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .dash-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; gap: 16px; }
    .dash-header h1{ margin-bottom: 4px; }
    .anio-ctrl     { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .anio-val      { font-size: 20px; font-weight: 600; color: var(--azul-osc); min-width: 56px; text-align: center; }

    .modulos-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    .modulo-card {
      background: #fff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--gris-border);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .mod-header {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 22px;
      border-bottom: 1px solid var(--gris-border);
    }
    .mod-header.poliza { background: linear-gradient(135deg,#EBF3FC 0%,#fff 100%); }
    .mod-header.cedis  { background: linear-gradient(135deg,#DCFCE7 0%,#fff 100%); }
    .mod-ico    { font-size: 28px; }
    .mod-titulo { font-size: 16px; font-weight: 600; color: var(--azul-osc); }
    .mod-sub    { font-size: 12px; color: var(--gris-med); margin-top: 2px; }

    .meses-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      background: var(--gris-border);
    }

    .mes-btn {
      display: flex; flex-direction: column; align-items: center;
      padding: 14px 8px;
      background: #fff;
      border: none;
      cursor: pointer;
      transition: background var(--trans);
      gap: 3px;
      &:hover { background: var(--azul-bg); }
    }
    .mes-nombre  { font-size: 13px; font-weight: 500; color: var(--gris-osc); }
    .mes-detalle { font-size: 10px; color: var(--gris-med); }

    @media (max-width: 768px) {
      .modulos-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent {
  auth   = inject(AuthService);
  router = inject(Router);
  anio   = signal(new Date().getFullYear());

  mesesPoliza = [
    { num:1,  nombre:'Enero',      grupo:1 }, { num:2,  nombre:'Febrero',    grupo:2 },
    { num:3,  nombre:'Marzo',      grupo:3 }, { num:4,  nombre:'Abril',      grupo:4 },
    { num:5,  nombre:'Mayo',       grupo:1 }, { num:6,  nombre:'Junio',      grupo:2 },
    { num:7,  nombre:'Julio',      grupo:3 }, { num:8,  nombre:'Agosto',     grupo:4 },
    { num:9,  nombre:'Septiembre', grupo:1 }, { num:10, nombre:'Octubre',    grupo:2 },
    { num:11, nombre:'Noviembre',  grupo:3 }, { num:12, nombre:'Diciembre',  grupo:4 },
  ];

  mesesCedis = [
    { num:10, nombre:'Octubre' },  { num:11, nombre:'Noviembre' },
    { num:12, nombre:'Diciembre' },{ num:1,  nombre:'Enero' },
    { num:2,  nombre:'Febrero' },  { num:3,  nombre:'Marzo' },
    { num:4,  nombre:'Abril' },    { num:5,  nombre:'Mayo' },
    { num:6,  nombre:'Junio' },    { num:7,  nombre:'Julio' },
    { num:8,  nombre:'Agosto' },   { num:9,  nombre:'Septiembre' },
  ];

  cambiarAnio(d: number): void { this.anio.update(a => a + d); }

  ir(tipo: 'polizas' | 'cedis', mes: number): void {
    this.router.navigate(['/' + tipo, this.anio(), mes]);
  }
}