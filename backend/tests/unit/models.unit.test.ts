import { Types } from 'mongoose';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { UserModel } from '../../src/models/user.model';

const objectId = (): Types.ObjectId => new Types.ObjectId();

/** Valida el documento y devuelve los errores por campo (vacío si es válido). */
async function validationErrors(doc: { validate: () => Promise<void> }): Promise<Record<string, unknown>> {
  try {
    await doc.validate();
    return {};
  } catch (error) {
    return (error as { errors: Record<string, unknown> }).errors;
  }
}

describe('modelo Usuario', () => {
  it('normaliza el correo (minúsculas y sin espacios) y acepta un rol válido', async () => {
    const user = new UserModel({ email: '  Ana@Organizacion.TEST ', passwordHash: 'hash', role: 'solicitante' });
    expect(await validationErrors(user)).toEqual({});
    expect(user.email).toBe('ana@organizacion.test');
  });

  it('rechaza correo inválido, rol inválido y contraseña vacía', async () => {
    const errors = await validationErrors(new UserModel({ email: 'no-es-correo', role: 'invitado' }));
    expect(errors['email']).toBeDefined();
    expect(errors['role']).toBeDefined();
    expect(errors['passwordHash']).toBeDefined();
  });

  it('nunca expone passwordHash en la respuesta JSON', () => {
    const json = new UserModel({ email: 'a@b.co', passwordHash: 'secreto', role: 'administrador' }).toJSON();
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('_id');
    expect(json).toHaveProperty('id');
  });
});

describe('modelo Espacio', () => {
  const valid = { name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' };

  it('es válido y queda activo por defecto', async () => {
    const space = new SpaceModel(valid);
    expect(await validationErrors(space)).toEqual({});
    expect(space.isActive).toBe(true);
  });

  it('rechaza nombre vacío, tipo inválido, capacidad no positiva o decimal y ubicación vacía', async () => {
    const errors = await validationErrors(new SpaceModel({ name: '   ', type: 'auditorio', capacity: 0, location: '' }));
    expect(errors['name']).toBeDefined();
    expect(errors['type']).toBeDefined();
    expect(errors['capacity']).toBeDefined();
    expect(errors['location']).toBeDefined();

    expect((await validationErrors(new SpaceModel({ ...valid, capacity: 2.5 })))['capacity']).toBeDefined();
  });
});

describe('modelo Reserva', () => {
  const valid = {
    userId: objectId(),
    spaceId: objectId(),
    localDate: '2026-11-10',
    startAt: new Date('2026-11-10T13:00:00.000Z'),
    endAt: new Date('2026-11-10T15:00:00.000Z'),
  };

  it('es válida y queda activa por defecto', async () => {
    const reservation = new ReservationModel(valid);
    expect(await validationErrors(reservation)).toEqual({});
    expect(reservation.status).toBe('activa');
  });

  it('rechaza una hora de fin igual o anterior al inicio', async () => {
    const equal = await validationErrors(new ReservationModel({ ...valid, endAt: valid.startAt }));
    const before = await validationErrors(new ReservationModel({ ...valid, endAt: new Date('2026-11-10T12:00:00.000Z') }));
    expect(equal['endAt']).toBeDefined();
    expect(before['endAt']).toBeDefined();
  });

  it('rechaza fecha local con formato incorrecto, estado inválido y referencias faltantes', async () => {
    const errors = await validationErrors(
      new ReservationModel({ ...valid, localDate: '10/11/2026', status: 'pendiente', userId: undefined }),
    );
    expect(errors['localDate']).toBeDefined();
    expect(errors['status']).toBeDefined();
    expect(errors['userId']).toBeDefined();
  });

  it('define los dos índices compuestos requeridos', () => {
    const keys = ReservationModel.schema.indexes().map(([fields]) => fields);
    expect(keys).toContainEqual({ spaceId: 1, localDate: 1, status: 1, startAt: 1, endAt: 1 });
    expect(keys).toContainEqual({ userId: 1, status: 1, startAt: 1 });
  });
});
