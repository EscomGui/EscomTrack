import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  titulo:    string;
  mensaje:   string;
  detalle?:  string;
  icono?:    string;
  btnOk:     string;
  btnCancel?: string;
  tipo?:     'info' | 'warn' | 'danger' | 'success';
}

@Injectable({ providedIn: 'root' })
export class DialogService {

  config    = signal<DialogConfig | null>(null);
  visible   = signal(false);

  private resolver?: (val: boolean) => void;

  confirm(cfg: DialogConfig): Promise<boolean> {
    this.config.set(cfg);
    this.visible.set(true);
    return new Promise(resolve => {
      this.resolver = resolve;
    });
  }

  responder(val: boolean): void {
    this.visible.set(false);
    this.config.set(null);
    this.resolver?.(val);
    this.resolver = undefined;
  }
}