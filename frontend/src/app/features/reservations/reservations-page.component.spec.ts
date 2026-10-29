import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AvailabilityApiService, AvailabilityResult } from '../availability/availability-api.service';
import { Reservation, ReservationsApiService } from './reservations-api.service';
import { ReservationsPageComponent } from './reservations-page.component';

const availability: AvailabilityResult = {
  date: '2026-11-10',
  timezone: 'America/Guayaquil',
  spaces: [
    {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Sala Norte',
      type: 'sala',
      capacity: 20,
      location: 'Edificio A',
      occupiedSlots: [{ startAt: '2026-11-10T08:00:00-05:00', endAt: '2026-11-10T10:00:00-05:00' }],
    },
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo', occupiedSlots: [] },
  ],
};

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    spaceId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    spaceName: 'Sala Norte',
    date: '2026-11-10',
    startAt: '2026-11-10T10:00:00-05:00',
    endAt: '2026-11-10T11:00:00-05:00',
    status: 'activa',
    ...overrides,
  };
}

describe('ReservationsPageComponent', () => {
  let fixture: ComponentFixture<ReservationsPageComponent>;
  let element: HTMLElement;
  const getAvailability = vi.fn();
  const create = vi.fn();
  const listMine = vi.fn();
  const cancel = vi.fn();

  beforeEach(async () => {
    [getAvailability, create, listMine, cancel].forEach((fn) => fn.mockReset());
    getAvailability.mockReturnValue(of(availability));
    listMine.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ReservationsPageComponent],
      providers: [
        { provide: AvailabilityApiService, useValue: { getAvailability } },
        { provide: ReservationsApiService, useValue: { create, listMine, cancel } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReservationsPageComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  async function setValue(selector: string, value: string, eventName = 'input'): Promise<void> {
    const control = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    await fixture.whenStable();
  }

  async function fillForm(spaceId: string, start: string, end: string): Promise<void> {
    await setValue('#space', spaceId, 'change');
    await setValue('#start', start);
    await setValue('#end', end);
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('carga los espacios y las reservas propias al abrir', () => {
    expect(getAvailability).toHaveBeenCalledTimes(1);
    expect(listMine).toHaveBeenCalledTimes(1);
    const options = Array.from(element.querySelectorAll('#space option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Selecciona un espacio', 'Sala Norte (capacidad 20)', 'Cancha 1 (capacidad 12)']);
    expect(element.textContent).toContain('Aún no tienes reservas.');
  });

  it('muestra los horarios ocupados del espacio elegido', async () => {
    await setValue('#space', 'aaaaaaaaaaaaaaaaaaaaaaaa', 'change');
    expect(element.querySelector('.occupied')?.textContent).toContain('08:00 – 10:00');
  });

  it('no llama a la API si faltan datos', async () => {
    await submit();
    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Selecciona un espacio.');
  });

  it('rechaza una hora de fin que no es posterior a la de inicio', async () => {
    await fillForm('aaaaaaaaaaaaaaaaaaaaaaaa', '11:00', '10:00');
    await submit();
    expect(create).not.toHaveBeenCalled();
    expect(element.querySelector('.form-error')?.textContent).toContain('posterior');
  });

  it('crea la reserva, confirma y actualiza la lista', async () => {
    create.mockReturnValue(of(reservation()));
    listMine.mockReturnValue(of([reservation()]));
    await fillForm('aaaaaaaaaaaaaaaaaaaaaaaa', '10:00', '11:00');
    await submit();

    expect(create).toHaveBeenCalledWith({
      spaceId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(element.querySelector('.success')?.textContent).toContain('Reserva creada: Sala Norte, 2026-11-10, 10:00 – 11:00.');
    expect(element.querySelectorAll('.item')).toHaveLength(1);
    expect(listMine).toHaveBeenCalledTimes(2);
  });

  it('muestra el conflicto de horario devuelto por el servidor', async () => {
    create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'CONFLICT', message: 'El espacio ya está reservado de 08:00 a 10:00; elige otro horario' } })),
    );
    await fillForm('aaaaaaaaaaaaaaaaaaaaaaaa', '09:00', '10:30');
    await submit();

    expect(element.querySelector('.form-error')?.textContent).toContain('El espacio ya está reservado de 08:00 a 10:00');
    expect(element.querySelector('.success')).toBeNull();
  });

  it('cancela una reserva activa y la muestra como cancelada', async () => {
    listMine.mockReturnValue(of([reservation()]));
    cancel.mockReturnValue(of(reservation({ status: 'cancelada' })));
    fixture = TestBed.createComponent(ReservationsPageComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    listMine.mockReturnValue(of([reservation({ status: 'cancelada' })]));
    element.querySelector<HTMLButtonElement>('button.secondary')!.click();
    await fixture.whenStable();

    expect(cancel).toHaveBeenCalledWith('r1');
    expect(element.querySelector('.success')?.textContent).toContain('Reserva cancelada: Sala Norte');
    expect(element.querySelector('.item .status')?.textContent).toContain('Cancelada');
    expect(element.querySelector('button.secondary')).toBeNull();
  });
});
