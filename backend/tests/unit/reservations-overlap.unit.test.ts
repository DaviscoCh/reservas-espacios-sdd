import { intervalsOverlap, type TimeInterval } from '../../src/services/reservations/overlap';

/** T028: regla existing.startAt < new.endAt y existing.endAt > new.startAt. */
function slot(from: string, to: string): TimeInterval {
  return { startAt: new Date(`2026-11-10T${from}:00.000Z`), endAt: new Date(`2026-11-10T${to}:00.000Z`) };
}

describe('regla de solapamiento de reservas', () => {
  const existing = slot('08:00', '10:00');

  it.each([
    ['empieza dentro de la reserva existente', slot('09:00', '11:00')],
    ['termina dentro de la reserva existente', slot('07:00', '09:00')],
    ['queda contenida en la reserva existente', slot('08:30', '09:30')],
    ['contiene a la reserva existente', slot('07:00', '11:00')],
    ['es idéntica a la reserva existente', slot('08:00', '10:00')],
    ['se cruza apenas un minuto al final', slot('09:59', '11:00')],
    ['se cruza apenas un minuto al inicio', slot('07:00', '08:01')],
  ])('hay solapamiento cuando la nueva reserva %s', (_caso, requested) => {
    expect(intervalsOverlap(existing, requested)).toBe(true);
  });

  it.each([
    ['termina antes de que empiece la existente', slot('06:00', '07:30')],
    ['empieza después de que termine la existente', slot('10:30', '12:00')],
  ])('no hay solapamiento cuando la nueva reserva %s', (_caso, requested) => {
    expect(intervalsOverlap(existing, requested)).toBe(false);
  });

  it('es simétrica: el orden de los intervalos no cambia el resultado', () => {
    const other = slot('09:00', '11:00');
    expect(intervalsOverlap(existing, other)).toBe(intervalsOverlap(other, existing));
  });
});
