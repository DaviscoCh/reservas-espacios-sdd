import * as os from 'node:os';
import mongoose, { type ConnectOptions } from 'mongoose';
import { getConfig } from './env';

/**
 * Abre la conexión con MongoDB usando MONGODB_URI (o la URI recibida).
 *
 * Se entrega el módulo `os` al driver de forma explícita (runtimeAdapters). Desde el driver 7.6
 * (Mongoose 9.10+) el driver lo carga con un `import()` dinámico que Jest rechaza, y entonces el
 * saludo inicial sale sin metadatos y MongoDB responde "Missing required sub-document 'driver'"
 * (NODE-7832). Es inofensivo fuera de Jest.
 */
export async function connectDatabase(
  uri: string = getConfig().mongodbUri,
  options: ConnectOptions = {},
): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri, { ...options, runtimeAdapters: { os } });
}

/** Cierra la conexión; se usa al apagar el servidor y al terminar las pruebas. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
