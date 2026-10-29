import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Role = 'solicitante' | 'administrador';

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

interface LoginResponse {
  token: string;
  user: SessionUser;
}

/**
 * Sesión de la persona autenticada. El token vive solo en memoria (no en localStorage),
 * por lo que recargar la página cierra la sesión; es una decisión de seguridad de la
 * primera versión.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<SessionUser | null>(null);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null && this.userState() !== null);

  login(email: string, password: string): Observable<SessionUser> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.tokenState.set(response.token);
          this.userState.set(response.user);
        }),
        map((response) => response.user),
      );
  }

  logout(): void {
    this.tokenState.set(null);
    this.userState.set(null);
  }
}
