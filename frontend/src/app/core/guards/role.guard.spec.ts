import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthSessionService, Role } from '../auth/auth-session.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let router: Router;
  let session: AuthSessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
  });

  function loginAs(role: Role): void {
    session.login('u@organizacion.test', 'x').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'jwt', user: { id: '1', email: 'u@organizacion.test', role } });
  }

  function run(...roles: Role[]): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      roleGuard(...roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('envía al login cuando no hay sesión', () => {
    const result = run('solicitante');
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('permite el acceso al rol autorizado', () => {
    loginAs('administrador');
    expect(run('administrador')).toBe(true);
  });

  it('permite el acceso cuando el rol está entre varios autorizados', () => {
    loginAs('solicitante');
    expect(run('solicitante', 'administrador')).toBe(true);
  });

  it('redirige a la pantalla principal del rol cuando el rol no está autorizado', () => {
    loginAs('solicitante');
    const result = run('administrador');
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/disponibilidad');
  });
});
