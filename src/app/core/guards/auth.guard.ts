import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const fireAuth = inject(Auth);
  const auth     = inject(AuthService);
  const router   = inject(Router);

  return new Promise(resolve => {
    const unsub = fireAuth.onAuthStateChanged(user => {
      unsub();
      if (user && auth.usuarioActual()) {
        resolve(true);
      } else if (user && !auth.usuarioActual()) {
        const interval = setInterval(() => {
          if (auth.usuarioActual()) {
            clearInterval(interval);
            resolve(true);
          } else if (!auth.cargando()) {
            clearInterval(interval);
            router.navigate(['/login']);
            resolve(false);
          }
        }, 50);
      } else {
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.esAdmin) return true;
  router.navigate(['/dashboard']);
  return false;
};

export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.esSuperAdmin) return true;
  router.navigate(['/dashboard']);
  return false;
};