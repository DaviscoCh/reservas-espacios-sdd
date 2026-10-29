import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../auth/auth-session.service';

const LOGIN_URL = `${environment.apiBaseUrl}/auth/login`;

/**
 * Agrega `Authorization: Bearer <token>` a las llamadas a la API y, si el servidor
 * responde 401 con una sesión abierta (token vencido o inválido), la cierra y lleva al login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const token = session.token();
  const isApiCall = request.url.startsWith(environment.apiBaseUrl);

  const outgoing =
    token && isApiCall && request.url !== LOGIN_URL
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && request.url !== LOGIN_URL) {
        session.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
