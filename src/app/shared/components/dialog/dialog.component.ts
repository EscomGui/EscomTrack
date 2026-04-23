import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialog.visible()) {
      <div class="dlg-backdrop" (click)="dialog.responder(false)">
        <div class="dlg-box"
             [class]="'dlg-' + (dialog.config()?.tipo ?? 'info')"
             (click)="$event.stopPropagation()">

          <!-- Icono + título -->
          <div class="dlg-header">
            @if (dialog.config()?.icono) {
              <span class="dlg-ico">{{ dialog.config()!.icono }}</span>
            }
            <span class="dlg-titulo">{{ dialog.config()?.titulo }}</span>
          </div>

          <!-- Mensaje -->
          <div class="dlg-body">
            <p class="dlg-mensaje">{{ dialog.config()?.mensaje }}</p>
            @if (dialog.config()?.detalle) {
              <p class="dlg-detalle">{{ dialog.config()!.detalle }}</p>
            }
          </div>

          <!-- Botones -->
          <div class="dlg-footer">
            @if (dialog.config()?.btnCancel) {
              <button class="btn btn-secondary"
                      (click)="dialog.responder(false)">
                {{ dialog.config()!.btnCancel }}
              </button>
            }
            <button class="btn"
                    [class]="btnClass()"
                    (click)="dialog.responder(true)">
              {{ dialog.config()?.btnOk }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .dlg-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.5);
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 150ms ease;
    }

    .dlg-box {
      background: #fff;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 380px;
      animation: slideUp 180ms ease;
      overflow: hidden;
    }

    .dlg-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 20px 0;
    }

    .dlg-ico    { font-size: 22px; flex-shrink: 0; }
    .dlg-titulo {
      font-size: 16px;
      font-weight: 600;
      color: var(--gris-osc);
      line-height: 1.3;
    }

    .dlg-body   { padding: 10px 20px 16px; }
    .dlg-mensaje {
      font-size: 14px;
      color: var(--gris-osc);
      line-height: 1.6;
      margin-bottom: 4px;
    }
    .dlg-detalle {
      font-size: 12px;
      color: var(--gris-med);
      padding: 8px 10px;
      background: var(--gris-bg);
      border-radius: var(--radius-sm);
      border: 1px solid var(--gris-border);
      margin-top: 8px;
      line-height: 1.5;
    }

    .dlg-footer {
      padding: 12px 20px 18px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* Variantes de color en el header */
    .dlg-danger  .dlg-ico { filter: none; }
    .dlg-danger  .dlg-titulo { color: var(--rojo-osc); }
    .dlg-warn    .dlg-titulo { color: var(--amarillo-osc); }
    .dlg-success .dlg-titulo { color: var(--verde-osc); }
    .dlg-info    .dlg-titulo { color: var(--azul-med); }

    /* Barra de color arriba según tipo */
    .dlg-danger::before  {
      content: '';
      display: block;
      height: 4px;
      background: var(--rojo-borde);
    }
    .dlg-warn::before {
      content: '';
      display: block;
      height: 4px;
      background: var(--amarillo-borde);
    }
    .dlg-success::before {
      content: '';
      display: block;
      height: 4px;
      background: var(--verde-borde);
    }
    .dlg-info::before {
      content: '';
      display: block;
      height: 4px;
      background: #93C5FD;
    }
  `],
})
export class DialogComponent {
  dialog = inject(DialogService);

  btnClass(): string {
    const tipo = this.dialog.config()?.tipo ?? 'info';
    const m: Record<string, string> = {
      danger:  'btn-danger',
      warn:    'btn-amber',
      success: 'btn-success',
      info:    'btn-primary',
    };
    return m[tipo] ?? 'btn-primary';
  }
}