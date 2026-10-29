import type { Role } from './auth-session.service';

/** Ruta a la que se envía a cada rol al iniciar sesión o al intentar entrar a una pantalla ajena. */
export const ROLE_HOME: Record<Role, string> = {
  solicitante: '/disponibilidad',
  administrador: '/admin/espacios',
};

export function homeFor(role: Role): string {
  return ROLE_HOME[role];
}

export const ROLE_LABELS: Record<Role, string> = {
  solicitante: 'Solicitante',
  administrador: 'Administrador',
};
