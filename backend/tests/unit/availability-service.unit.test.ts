import { Types } from 'mongoose';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { getAvailability, parseAvailabilityDate } from '../../src/services/spaces/availability.service';
import { zonedDateTimeToUtc } from '../../src/utils/datetime';

/** Lógica de disponibilidad sin base de datos: los modelos se reemplazan por dobles. */
afterEach(() => {
  jest.restoreAllMocks();
});

describe('parseAvailabilityDate', () => {
  it('acepta una fecha válida y recorta espacios', () => {
    expect(parseAvailabilityDate(' 2026-11-10 ')).toBe('2026-11-10');
  });

  it.each([undefined, '', '   ', 20261110, ['2026-11-10'], '2026-13-01', '2026-02-30', '10/11/2026'])(
    'rechaza %p con 400',
    (value) => {
      expect(() => parseAvailabilityDate(value)).toThrow(expect.objectContaining({ status: 400 }));
    },
  );
});

describe('getAvailability', () => {
  it('agrupa por espacio, ordena por nombre y formatea los horarios en la zona de Guayaquil', async () => {
    const north = { _id: new Types.ObjectId(), name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' };
    const court = { _id: new Types.ObjectId(), name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo' };
    jest.spyOn(SpaceModel, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([north, court]) } as never);
    const reservationFind = jest.spyOn(ReservationModel, 'find').mockReturnValue({
      sort: () => ({
        lean: jest.fn().mockResolvedValue([
          {
            spaceId: north._id,
            startAt: zonedDateTimeToUtc('2026-11-10', '08:00'),
            endAt: zonedDateTimeToUtc('2026-11-10', '10:00'),
          },
        ]),
      }),
    } as never);

    const result = await getAvailability('2026-11-10');

    expect(reservationFind).toHaveBeenCalledWith(
      expect.objectContaining({ localDate: '2026-11-10', status: 'activa' }),
    );
    expect(result.date).toBe('2026-11-10');
    expect(result.timezone).toBe('America/Guayaquil');
    expect(result.spaces.map((space) => space.name)).toEqual(['Cancha 1', 'Sala Norte']);
    expect(result.spaces[0]?.occupiedSlots).toEqual([]);
    expect(result.spaces[1]?.occupiedSlots).toEqual([
      { startAt: '2026-11-10T08:00:00-05:00', endAt: '2026-11-10T10:00:00-05:00' },
    ]);
  });

  it('solo consulta los espacios activos', async () => {
    const find = jest.spyOn(SpaceModel, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([]) } as never);
    jest.spyOn(ReservationModel, 'find').mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([]) }) } as never);

    await getAvailability('2026-11-10');
    expect(find).toHaveBeenCalledWith({ isActive: true });
  });
});
