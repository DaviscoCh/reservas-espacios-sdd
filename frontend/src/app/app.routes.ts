import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'disponibilidad',
    canActivate: [roleGuard('solicitante', 'administrador')],
    loadComponent: () =>
      import('./features/availability/availability-page.component').then(
        (m) => m.AvailabilityPageComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'disponibilidad' },
  { path: '**', redirectTo: 'disponibilidad' },
];
