import { intervalsOverlap, type TimeInterval } from '../../src/services/reservations/overlap';

/** T028A: dos reservas consecutivas (fin == inicio) son válidas y no se consideran solapamiento (FR-008). */
function slot(from: string, to: string): TimeInterval {
  return { startAt: new Date(`2026-11-10T${from}:00.000Z`), endAt: new Date(`2026-11-10T${to}:00.000Z`) };
}

describe('adyacencia de reservas', () => {
  it('una reserva que empieza justo cuando termina la existente no se solapa', () => {
    expect(intervalsOverlap(slot('08:00', '10:00'), slot('10:00', '11:00'))).toBe(false);
  });

  it('una reserva que termina justo cuando empieza la existente no se solapa', () => {
    expect(intervalsOverlap(slot('10:00', '12:00'), slot('09:00', '10:00'))).toBe(false);
  });

  it('una cadena de reservas consecutivas no genera ningún solapamiento', () => {
    const chain = [slot('08:00', '09:00'), slot('09:00', '10:00'), slot('10:00', '11:00')];
    for (let i = 0; i < chain.length; i += 1) {
      for (let j = i + 1; j < chain.length; j += 1) {
        expect(intervalsOverlap(chain[i] as TimeInterval, chain[j] as TimeInterval)).toBe(false);
      }
    }
  });
});
