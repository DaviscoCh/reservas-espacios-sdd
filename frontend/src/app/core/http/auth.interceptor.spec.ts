import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService } from '../auth/auth-session.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: AuthSessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function openSession(): void {
    session.login('a@b.test', 'x').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'jwt-123', user: { id: '1', email: 'a@b.test', role: 'solicitante' } });
  }

  it('no agrega el encabezado Authorization sin sesión', () => {
    client.get('/api/spaces').subscribe();
    const request = http.expectOne('/api/spaces');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('agrega Authorization: Bearer con sesión abierta', () => {
    openSession();
    client.get('/api/spaces').subscribe();
    const request = http.expectOne('/api/spaces');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    request.flush([]);
  });

  it('no envía el token a direcciones que no son de la API', () => {
    openSession();
    client.get('https://otro-sitio.test/datos').subscribe();
    const request = http.expectOne('https://otro-sitio.test/datos');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('cierra la sesión y va al login cuando la API responde 401', () => {
    openSession();
    client.get('/api/reservations/me').subscribe({ error: () => undefined });
    http.expectOne('/api/reservations/me').flush({ code: 'UNAUTHORIZED', message: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
