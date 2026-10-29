import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  AvailabilityApiService,
  AvailabilityResult,
} from './availability-api.service';
import { AvailabilityPageComponent, todayInTimezone } from './availability-page.component';

const sample: AvailabilityResult = {
  date: '2026-11-10',
  timezone: 'America/Guayaquil',
  spaces: [
    {
      id: 's1',
      name: 'Cancha 1',
      type: 'cancha',
      capacity: 12,
      location: 'Complejo deportivo',
      occupiedSlots: [
        { startAt: '2026-11-10T08:00:00-05:00', endAt: '2026-11-10T10:00:00-05:00' },
        { startAt: '2026-11-10T14:30:00-05:00', endAt: '2026-11-10T15:30:00-05:00' },
      ],
    },
    { id: 's2', name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A', occupiedSlots: [] },
  ],
};

describe('todayInTimezone', () => {
  it('usa la fecha de Guayaquil aunque en UTC ya sea el día siguiente', () => {
    // 2026-11-11 02:00 UTC = 2026-11-10 21:00 en Guayaquil (UTC-5)
    expect(todayInTimezone('America/Guayaquil', new Date('2026-11-11T02:00:00Z'))).toBe('2026-11-10');
  });
});

describe('AvailabilityPageComponent', () => {
  let fixture: ComponentFixture<AvailabilityPageComponent>;
  let element: HTMLElement;
  const getAvailability = vi.fn();

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AvailabilityPageComponent],
      providers: [{ provide: AvailabilityApiService, useValue: { getAvailability } }],
    }).compileComponents();
    fixture = TestBed.createComponent(AvailabilityPageComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => getAvailability.mockReset());

  it('consulta la disponibilidad de hoy al abrir y lista los espacios', async () => {
    getAvailability.mockReturnValue(of(sample));
    await create();

    expect(getAvailability).toHaveBeenCalledTimes(1);
    expect(getAvailability.mock.calls[0]![0]).toBe(todayInTimezone('America/Guayaquil'));
    const names = Array.from(element.querySelectorAll('.space h2')).map((n) => n.textContent?.trim());
    expect(names).toEqual(['Cancha 1', 'Sala Norte']);
    expect(element.textContent).toContain('Cancha · Capacidad 12 · Complejo deportivo');
  });

  it('muestra los horarios ocupados y "Libre todo el día" cuando no hay reservas', async () => {
    getAvailability.mockReturnValue(of(sample));
    await create();

    const slots = Array.from(element.querySelectorAll('.slots li')).map((n) => n.textContent?.trim());
    expect(slots).toEqual(['08:00 – 10:00', '14:30 – 15:30']);
    expect(element.querySelectorAll('.free')).toHaveLength(1);
    expect(element.querySelector('.free')?.textContent).toContain('Libre todo el día');
  });

  it('vuelve a consultar con la fecha elegida en el filtro', async () => {
    getAvailability.mockReturnValue(of(sample));
    await create();

    const input = element.querySelector<HTMLInputElement>('#date')!;
    input.value = '2026-11-12';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(getAvailability).toHaveBeenLastCalledWith('2026-11-12');
  });

  it('ignora la respuesta de una fecha anterior si se cambia de fecha antes de que llegue', async () => {
    const first = new Subject<AvailabilityResult>();
    const second = new Subject<AvailabilityResult>();
    getAvailability.mockReturnValueOnce(first).mockReturnValueOnce(second);
    await create();

    const input = element.querySelector<HTMLInputElement>('#date')!;
    input.value = '2026-11-12';
    input.dispatchEvent(new Event('change'));
    second.next({ ...sample, spaces: [sample.spaces[1]!] });
    first.next(sample); // llega tarde: debe descartarse
    await fixture.whenStable();

    const names = Array.from(element.querySelectorAll('.space h2')).map((n) => n.textContent?.trim());
    expect(names).toEqual(['Sala Norte']);
  });

  it('muestra un mensaje cuando no hay espacios activos', async () => {
    getAvailability.mockReturnValue(of({ ...sample, spaces: [] }));
    await create();
    expect(element.textContent).toContain('No hay espacios activos para mostrar.');
  });

  it('muestra el error y permite reintentar', async () => {
    getAvailability.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'BAD_REQUEST', message: 'La fecha no es válida' } })),
    );
    await create();
    expect(element.querySelector('.error')?.textContent).toContain('La fecha no es válida');

    getAvailability.mockReturnValue(of(sample));
    element.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.space')).toHaveLength(2);
  });
});
