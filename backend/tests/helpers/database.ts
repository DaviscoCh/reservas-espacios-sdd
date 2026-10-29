import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';

/**
 * Ayudas para las pruebas que usan una instancia real de MongoDB. Solo se ejecutan si se define
 * MONGODB_TEST_URI, por ejemplo: mongodb://127.0.0.1:27017/reservas-espacios-test.
 * Cada archivo de pruebas usa su propia base (URI + sufijo), porque Jest ejecuta los archivos
 * en paralelo y cada uno vacía su base al empezar y al terminar.
 */
const baseUri = process.env['MONGODB_TEST_URI'];

export const describeWithDatabase = baseUri ? describe : describe.skip;

export function testDatabaseUri(suffix: string): string {
  const url = new URL(baseUri ?? 'mongodb://127.0.0.1:27017/reservas-espacios-test');
  const name = url.pathname.replace(/^\/+|\/+$/g, '') || 'reservas-espacios-test';
  url.pathname = `/${name}-${suffix}`;
  return url.toString();
}

export async function connectTestDatabase(suffix: string): Promise<void> {
  // Si MongoDB no responde, falla en 5 s con el motivo real en vez de colgar la prueba.
  await connectDatabase(testDatabaseUri(suffix), { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
}

export async function closeTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
}
