import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../services/auth/auth.service';

/**
 * Crea (o actualiza) dos cuentas de demostración para probar el login a mano.
 * Solo para desarrollo: no se ejecuta en producción.
 * Uso: npm --prefix backend run seed
 */
const DEMO_USERS = [
  { email: 'solicitante@organizacion.test', password: 'Solicitante123', role: 'solicitante' },
  { email: 'admin@organizacion.test', password: 'Admin12345', role: 'administrador' },
] as const;

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Las cuentas de demostración no se crean en producción');
  }
  await connectDatabase();
  try {
    for (const demo of DEMO_USERS) {
      await UserModel.updateOne(
        { email: demo.email },
        { $set: { passwordHash: await hashPassword(demo.password), role: demo.role } },
        { upsert: true, setDefaultsOnInsert: true },
      );
      console.log(`Cuenta lista: ${demo.email} (${demo.role})`);
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
