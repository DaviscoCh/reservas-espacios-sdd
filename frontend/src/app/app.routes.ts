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
  {
    path: 'reservas',
    canActivate: [roleGuard('solicitante')],
    loadComponent: () =>
      import('./features/reservations/reservations-page.component').then(
        (m) => m.ReservationsPageComponent,
      ),
  },
  {
    path: 'admin/espacios',
    canActivate: [roleGuard('administrador')],
    loadComponent: () =>
      import('./features/spaces/spaces-admin-page.component').then(
        (m) => m.SpacesAdminPageComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'disponibilidad' },
  { path: '**', redirectTo: 'disponibilidad' },
];
