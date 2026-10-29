import mongoose, { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { UserModel } from '../../src/models/user.model';

/**
 * Prueba contra una instancia real de MongoDB. Solo se ejecuta si se define MONGODB_TEST_URI,
 * por ejemplo: MONGODB_TEST_URI=mongodb://127.0.0.1:27017/reservas-espacios-test npm test
 * (en el pipeline de CI se usará mongodb-memory-server en las pruebas de las historias).
 */
const testUri = process.env['MONGODB_TEST_URI'];
const describeWithDatabase = testUri ? describe : describe.skip;

describeWithDatabase('persistencia en MongoDB (Mongoose)', () => {
  beforeAll(async () => {
    // Si MongoDB no responde, falla en 5 s con el motivo real en vez de colgar la prueba.
    await connectDatabase(testUri, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();
    await Promise.all([UserModel.init(), SpaceModel.init(), ReservationModel.init()]);
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
    await disconnectDatabase();
  }, 30000);

  it('guarda usuarios en la colección usuarios con correo único y sin exponer passwordHash', async () => {
    const user = await UserModel.create({ email: 'Ana@Test.com', passwordHash: 'hash', role: 'solicitante' });
    expect(user.email).toBe('ana@test.com');
    expect(user.toJSON()).not.toHaveProperty('passwordHash');

    const found = await UserModel.findById(user._id);
    expect(found?.passwordHash).toBeUndefined(); // select:false

    await expect(UserModel.create({ email: 'ana@test.com', passwordHash: 'otro', role: 'solicitante' })).rejects.toMatchObject({
      code: 11000,
    });
    expect(UserModel.collection.name).toBe('usuarios');
  });

  it('guarda espacios y reservas en sus colecciones y crea los índices compuestos', async () => {
    const user = await UserModel.create({ email: 'luis@test.com', passwordHash: 'hash', role: 'solicitante' });
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    expect(space.isActive).toBe(true);

    const reservation = await ReservationModel.create({
      userId: user._id,
      spaceId: space._id as Types.ObjectId,
      localDate: '2026-11-10',
      startAt: new Date('2026-11-10T13:00:00.000Z'),
      endAt: new Date('2026-11-10T15:00:00.000Z'),
    });
    expect(reservation.status).toBe('activa');

    const indexKeys = (await ReservationModel.collection.indexes()).map((index) => index.key);
    expect(indexKeys).toContainEqual({ spaceId: 1, localDate: 1, status: 1, startAt: 1, endAt: 1 });
    expect(indexKeys).toContainEqual({ userId: 1, status: 1, startAt: 1 });
    expect([SpaceModel.collection.name, ReservationModel.collection.name]).toEqual(['espacios', 'reservas']);
  });
});
