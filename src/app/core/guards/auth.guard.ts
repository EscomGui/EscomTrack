import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const fireAuth = inject(Auth);
  const auth     = inject(AuthService);
  const router   = inject(Router);

  return new Promise(resolve => {
    // Espera el primer estado de Firebase Auth
    const unsub = fireAuth.onAuthStateChanged(user => {
      unsub(); // se desuscribe inmediatamente después del primer evento
      if (user && auth.usuarioActual()) {
        resolve(true);
      } else if (user && !auth.usuarioActual()) {
        // Firebase tiene sesión pero el perfil aún no cargó
        // Esperamos un poco más
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