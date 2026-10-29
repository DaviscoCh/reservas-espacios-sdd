import { Types } from 'mongoose';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { createReservation } from '../../src/services/reservations/reservations.service';
import type { ReservationRequest } from '../../src/services/reservations/reservations-validation.service';

/**
 * T032 sin base de datos: los modelos se reemplazan por una "base" en memoria con latencia, que
 * reproduce el riesgo real: sin bloqueo, dos solicitudes simultáneas verificarían el solapamiento
 * antes de que cualquiera guarde y ambas se crearían.
 */
const NOW = new Date('2030-01-10T12:00:00.000Z');
const USER_ID = String(new Types.ObjectId());

interface StoredReservation {
  spaceId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  localDate: string;
  userId: Types.ObjectId;
}

let store: StoredReservation[];
const activeSpaces = new Map<string, { _id: Types.ObjectId; name: string; isActive: boolean }>();
const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

function addSpace(name: string, isActive = true): string {
  const _id = new Types.ObjectId();
  activeSpaces.set(String(_id), { _id, name, isActive });
  return String(_id);
}

function request(spaceId: string, start: string, end: string): ReservationRequest {
  return { spaceId, date: '2030-01-15', startTime: start, endTime: end };
}

beforeEach(() => {
  store = [];
  activeSpaces.clear();

  jest.spyOn(SpaceModel, 'findById').mockImplementation((async (id: unknown) => {
    await pause();
    return activeSpaces.get(String(id)) ?? null;
  }) as never);

  jest.spyOn(ReservationModel, 'findOne').mockImplementation((async (filter: {
    spaceId: Types.ObjectId;
    startAt: { $lt: Date };
    endAt: { $gt: Date };
  }) => {
    await pause();
    return (
      store.find(
        (r) =>
          String(r.spaceId) === String(filter.spaceId) &&
          r.startAt.getTime() < filter.startAt.$lt.getTime() &&
          r.endAt.getTime() > filter.endAt.$gt.getTime(),
      ) ?? null
    );
  }) as never);

  jest.spyOn(ReservationModel, 'create').mockImplementation((async (doc: StoredReservation) => {
    await pause();
    store.push(doc);
    return { ...doc, _id: new Types.ObjectId(), status: 'activa' };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('servicio de reservas', () => {
  it('crea una reserva válida y la devuelve con horas de Guayaquil', async () => {
    const spaceId = addSpace('Sala Norte');
    const reservation = await createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW);

    expect(reservation).toMatchObject({
      spaceId,
      spaceName: 'Sala Norte',
      date: '2030-01-15',
      startAt: '2030-01-15T08:00:00-05:00',
      endAt: '2030-01-15T10:00:00-05:00',
      status: 'activa',
    });
    expect(store).toHaveLength(1);
  });

  it('rechaza con 404 un espacio inexistente y con 409 uno desactivado', async () => {
    await expect(createReservation(USER_ID, request(String(new Types.ObjectId()), '08:00', '10:00'), NOW)).rejects.toMatchObject({
      status: 404,
    });
    const inactive = addSpace('Cancha 1', false);
    await expect(createReservation(USER_ID, request(inactive, '08:00', '10:00'), NOW)).rejects.toMatchObject({ status: 409 });
    expect(store).toHaveLength(0);
  });

  it('rechaza con 409 un solapamiento e informa el horario ocupado', async () => {
    const spaceId = addSpace('Sala Norte');
    await createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW);

    await expect(createReservation(USER_ID, request(spaceId, '09:00', '11:00'), NOW)).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('08:00 a 10:00'),
    });
    expect(store).toHaveLength(1);
  });

  it('acepta una reserva consecutiva (fin == inicio)', async () => {
    const spaceId = addSpace('Sala Norte');
    await createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW);
    await expect(createReservation(USER_ID, request(spaceId, '10:00', '11:00'), NOW)).resolves.toMatchObject({ status: 'activa' });
    expect(store).toHaveLength(2);
  });

  it('rechaza con 400 antes de consultar la base de datos', async () => {
    const spaceId = addSpace('Sala Norte');
    await expect(createReservation(USER_ID, request(spaceId, '10:00', '09:00'), NOW)).rejects.toMatchObject({ status: 400 });
    expect(SpaceModel.findById).not.toHaveBeenCalled();
  });

  it('con 3 solicitudes simultáneas al mismo espacio y horario solo una se crea y las otras 2 reciben 409', async () => {
    const spaceId = addSpace('Sala Norte');
    const results = await Promise.allSettled([
      createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW),
      createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW),
      createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(2);
    expect(rejected.every((r) => (r.reason as { status: number }).status === 409)).toBe(true);
    expect(store).toHaveLength(1);
  });

  it('con horarios que se cruzan parcialmente y simultáneos solo una se crea', async () => {
    const spaceId = addSpace('Sala Norte');
    const results = await Promise.allSettled([
      createReservation(USER_ID, request(spaceId, '08:00', '10:00'), NOW),
      createReservation(USER_ID, request(spaceId, '09:00', '11:00'), NOW),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(store).toHaveLength(1);
  });

  it('el identificador en mayúsculas y en minúsculas usa el mismo bloqueo', async () => {
    const spaceId = addSpace('Sala Norte');
    const results = await Promise.allSettled([
      createReservation(USER_ID, request(spaceId.toUpperCase(), '08:00', '10:00'), NOW),
      createReservation(USER_ID, request(spaceId.toLowerCase(), '08:00', '10:00'), NOW),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(store).toHaveLength(1);
  });

  it('el bloqueo es por espacio: dos espacios distintos se reservan a la vez sin conflicto', async () => {
    const north = addSpace('Sala Norte');
    const south = addSpace('Sala Sur');
    const results = await Promise.allSettled([
      createReservation(USER_ID, request(north, '08:00', '10:00'), NOW),
      createReservation(USER_ID, request(south, '08:00', '10:00'), NOW),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(store).toHaveLength(2);
  });
});
