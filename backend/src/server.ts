import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { getConfig } from './config/env';

async function main(): Promise<void> {
  const config = getConfig();
  await connectDatabase(config.mongodbUri);
  console.log('Conexión a MongoDB establecida');

  app.listen(config.port, () => {
    console.log(`API de reservas escuchando en http://localhost:${config.port}/api`);
  });
}

main().catch((error: unknown) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
