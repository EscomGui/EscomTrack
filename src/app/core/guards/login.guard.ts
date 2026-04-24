import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const fireAuth = inject(Auth);
  const auth     = inject(AuthService);
  const router   = inject(Router);

  return new Promise(resolve => {
    const unsub = fireAuth.onAuthStateChanged(user => {
      unsub();
      if (user && auth.usuarioActual()) {
        router.navigate(['/dashboard']);
        resolve(false);
      } else if (user && !auth.usuarioActual()) {
        const interval = setInterval(() => {
          if (auth.usuarioActual()) {
            clearInterval(interval);
            router.navigate(['/dashboard']);
            resolve(false);
          } else if (!auth.cargando()) {
            clearInterval(interval);
            resolve(true);
          }
        }, 50);
      } else {
        resolve(true);
      }
    });
  });
};