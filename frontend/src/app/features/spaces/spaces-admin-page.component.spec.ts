import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Space, SpacesAdminApiService } from './spaces-admin-api.service';
import { SpacesAdminPageComponent } from './spaces-admin-page.component';

function space(overrides: Partial<Space> = {}): Space {
  return { id: 's1', name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A', isActive: true, ...overrides };
}

describe('SpacesAdminPageComponent', () => {
  let fixture: ComponentFixture<SpacesAdminPageComponent>;
  let element: HTMLElement;
  const list = vi.fn();
  const create = vi.fn();
  const update = vi.fn();

  beforeEach(async () => {
    [list, create, update].forEach((fn) => fn.mockReset());
    list.mockReturnValue(of([space(), space({ id: 's2', name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo', isActive: false })]));

    await TestBed.configureTestingModule({
      imports: [SpacesAdminPageComponent],
      providers: [{ provide: SpacesAdminApiService, useValue: { list, create, update } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SpacesAdminPageComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  async function setValue(selector: string, value: string, eventName = 'input'): Promise<void> {
    const control = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    await fixture.whenStable();
  }

  async function click(selector: string, text?: string): Promise<void> {
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>(selector));
    const target = text ? buttons.find((b) => b.textContent?.trim() === text) : buttons[0];
    target!.click();
    await fixture.whenStable();
  }

  it('lista los espacios con su estado', () => {
    const items = Array.from(element.querySelectorAll('.item')).map((i) => i.textContent?.replace(/\s+/g, ' ').trim());
    expect(items[0]).toContain('Sala Norte');
    expect(items[0]).toContain('Activo');
    expect(items[1]).toContain('Cancha 1');
    expect(items[1]).toContain('Desactivado');
  });

  it('solo ofrece desactivar los espacios activos', () => {
    const rows = Array.from(element.querySelectorAll('.item'));
    expect(rows[0]!.querySelector('.danger-outline')).not.toBeNull();
    expect(rows[1]!.querySelector('.danger-outline')).toBeNull();
  });

  it('no llama a la API si faltan datos', async () => {
    await click('button[type="submit"]');
    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa el nombre.');
    expect(element.textContent).toContain('Ingresa la ubicación.');
  });

  it('rechaza una capacidad menor que uno', async () => {
    await setValue('#name', 'Sala Sur');
    await setValue('#location', 'Edificio B');
    await setValue('#capacity', '0');
    await click('button[type="submit"]');
    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('La capacidad debe ser mayor que cero.');
  });

  it('crea un espacio y actualiza la lista', async () => {
    create.mockReturnValue(of(space({ id: 's3', name: 'Sala Sur', capacity: 8, location: 'Edificio B' })));
    await setValue('#name', '  Sala Sur ');
    await setValue('#type', 'sala', 'change');
    await setValue('#capacity', '8');
    await setValue('#location', 'Edificio B');
    await click('button[type="submit"]');

    expect(create).toHaveBeenCalledWith({ name: 'Sala Sur', type: 'sala', capacity: 8, location: 'Edificio B' });
    expect(element.querySelector('.success')?.textContent).toContain('Espacio creado: Sala Sur.');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('muestra el error del servidor al crear', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'BAD_REQUEST', message: 'El tipo debe ser sala o cancha' } })));
    await setValue('#name', 'X');
    await setValue('#location', 'Y');
    await click('button[type="submit"]');
    expect(element.querySelector('.form-error')?.textContent).toContain('El tipo debe ser sala o cancha');
  });

  it('carga los datos al editar y guarda los cambios', async () => {
    update.mockReturnValue(of(space({ capacity: 25 })));
    await click('.item button.secondary', 'Editar');

    expect(element.querySelector('h1')?.textContent).toContain('Editar espacio');
    expect(element.querySelector<HTMLInputElement>('#name')!.value).toBe('Sala Norte');
    expect(element.querySelector<HTMLInputElement>('#capacity')!.value).toBe('20');

    await setValue('#capacity', '25');
    await click('button[type="submit"]');

    expect(update).toHaveBeenCalledWith('s1', { name: 'Sala Norte', type: 'sala', capacity: 25, location: 'Edificio A' });
    expect(element.querySelector('.success')?.textContent).toContain('Espacio actualizado: Sala Norte.');
    expect(element.querySelector('h1')?.textContent).toContain('Nuevo espacio');
  });

  it('pide confirmación antes de desactivar y permite arrepentirse', async () => {
    await click('.danger-outline');
    expect(element.textContent).toContain('¿Desactivar Sala Norte?');
    expect(update).not.toHaveBeenCalled();

    await click('button.secondary', 'No');
    expect(element.textContent).not.toContain('¿Desactivar Sala Norte?');
    expect(update).not.toHaveBeenCalled();
  });

  it('desactiva el espacio al confirmar y vuelve a cargar la lista', async () => {
    update.mockReturnValue(of(space({ isActive: false })));
    list.mockReturnValue(of([space({ isActive: false })]));
    await click('.danger-outline');
    await click('button.danger', 'Confirmar');

    expect(update).toHaveBeenCalledWith('s1', { isActive: false });
    expect(element.querySelector('.success')?.textContent).toContain('Espacio desactivado: Sala Norte');
    expect(element.querySelector('.item .status')?.textContent).toContain('Desactivado');
    expect(element.querySelector('.danger-outline')).toBeNull();
  });
});
