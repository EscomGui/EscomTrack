import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
    },
    {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component')
        .then(m => m.LoginComponent),
    },
    {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
    },
{
  path: 'polizas/:anio/:mes',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/polizas/calendario/calendario.component')
      .then(m => m.CalendarioPolizasComponent),
},
{
  path: 'cedis/:anio/:mes',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/cedis/calendario/calendario.component')
        .then(m => m.CalendarioCedisComponent),
},
    {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin.component')
        .then(m => m.AdminComponent),
    },
    {
    path: '**',
    redirectTo: 'dashboard'
    },
];