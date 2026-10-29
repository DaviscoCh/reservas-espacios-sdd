import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthSessionService } from './core/auth/auth-session.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el título y no muestra el botón de salir sin sesión', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('header strong')?.textContent).toContain('Reservas de espacios');
    expect(element.querySelector('header button')).toBeNull();
  });

  it('muestra la cuenta y el rol cuando hay sesión', async () => {
    const session = TestBed.inject(AuthSessionService);
    const http = TestBed.inject((await import('@angular/common/http/testing')).HttpTestingController);
    session.login('admin@organizacion.test', 'Admin12345').subscribe();
    http.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: '1', email: 'admin@organizacion.test', role: 'administrador' },
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.session span')?.textContent).toContain('admin@organizacion.test · Administrador');
    expect(element.querySelector('.session button')?.textContent).toContain('Cerrar sesión');
  });
});
