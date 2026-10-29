import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let element: HTMLElement;
  let router: Router;
  const login = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthSessionService, useValue: { login } }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPageComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  async function fill(email: string, password: string): Promise<void> {
    const email$ = element.querySelector<HTMLInputElement>('#email')!;
    const password$ = element.querySelector<HTMLInputElement>('#password')!;
    email$.value = email;
    email$.dispatchEvent(new Event('input'));
    password$.value = password;
    password$.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('no llama a la API y muestra errores si los campos están vacíos', async () => {
    await submit();
    expect(login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un correo válido.');
    expect(element.textContent).toContain('Ingresa tu contraseña.');
  });

  it('rechaza un correo con formato inválido sin llamar a la API', async () => {
    await fill('no-es-correo', 'algo');
    await submit();
    expect(login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un correo válido.');
  });

  it('inicia sesión y navega a la pantalla principal del rol', async () => {
    login.mockReturnValue(of({ id: '1', email: 'solicitante@organizacion.test', role: 'solicitante' }));
    await fill(' solicitante@organizacion.test ', 'Solicitante123');
    await submit();

    expect(login).toHaveBeenCalledWith('solicitante@organizacion.test', 'Solicitante123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/disponibilidad');
  });

  it('lleva al administrador a la administración de espacios', async () => {
    login.mockReturnValue(of({ id: '2', email: 'admin@organizacion.test', role: 'administrador' }));
    await fill('admin@organizacion.test', 'Admin12345');
    await submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/espacios');
  });

  it('muestra el mensaje del servidor cuando las credenciales son incorrectas', async () => {
    login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, error: { code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' } })),
    );
    await fill('solicitante@organizacion.test', 'mala');
    await submit();

    expect(element.querySelector('.form-error')?.textContent).toContain('Correo o contraseña incorrectos');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('muestra un mensaje de conexión cuando el servidor no responde', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await fill('solicitante@organizacion.test', 'Solicitante123');
    await submit();
    expect(element.querySelector('.form-error')?.textContent).toContain('No se pudo conectar con el servidor');
  });
});
