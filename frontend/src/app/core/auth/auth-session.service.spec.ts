import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let session: AuthSessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
  });

  it('empieza sin sesión', () => {
    expect(session.isAuthenticated()).toBe(false);
    expect(session.token()).toBeNull();
    expect(session.user()).toBeNull();
  });

  it('guarda token y usuario en memoria tras un login correcto', () => {
    let result: unknown;
    session.login('solicitante@organizacion.test', 'Solicitante123').subscribe((user) => (result = user));

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'solicitante@organizacion.test', password: 'Solicitante123' });
    request.flush({ token: 'jwt', user: { id: '1', email: 'solicitante@organizacion.test', role: 'solicitante' } });

    expect(result).toEqual({ id: '1', email: 'solicitante@organizacion.test', role: 'solicitante' });
    expect(session.isAuthenticated()).toBe(true);
    expect(session.token()).toBe('jwt');
  });

  it('no abre sesión si el login falla', () => {
    session.login('x@y.test', 'mala').subscribe({ error: () => undefined });
    http.expectOne('/api/auth/login').flush({ code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });
    expect(session.isAuthenticated()).toBe(false);
  });

  it('cierra la sesión y borra el token', () => {
    session.login('a@b.test', 'x').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'jwt', user: { id: '1', email: 'a@b.test', role: 'solicitante' } });
    session.logout();
    expect(session.isAuthenticated()).toBe(false);
    expect(session.token()).toBeNull();
  });
});
