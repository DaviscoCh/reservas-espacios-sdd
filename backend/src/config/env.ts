export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  timezone: string;
  operatingDayStart: string;
  operatingDayEnd: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function readTime(name: string, fallback: string): string {
  const value = process.env[name] ?? fallback;
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`La variable ${name} debe tener formato HH:mm (valor recibido: "${value}")`);
  }
  return value;
}

/**
 * Lee la configuración desde variables de entorno en cada llamada, de modo que
 * las pruebas puedan modificar process.env sin recargar módulos.
 */
export function getConfig(): AppConfig {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  const jwtSecret = process.env['JWT_SECRET'] ?? '';

  if (jwtSecret.trim() === '') {
    throw new Error('La variable JWT_SECRET es obligatoria');
  }
  if (nodeEnv === 'production' && jwtSecret === 'change-me') {
    throw new Error('JWT_SECRET no puede usar el valor de ejemplo en producción');
  }

  const port = Number(process.env['PORT'] ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('La variable PORT debe ser un entero positivo');
  }

  const operatingDayStart = readTime('OPERATING_DAY_START', '07:00');
  const operatingDayEnd = readTime('OPERATING_DAY_END', '22:00');
  if (operatingDayStart >= operatingDayEnd) {
    throw new Error('OPERATING_DAY_START debe ser anterior a OPERATING_DAY_END');
  }

  return {
    nodeEnv,
    port,
    mongodbUri: process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/reservas-espacios',
    jwtSecret,
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '8h',
    timezone: process.env['APP_TIMEZONE'] ?? 'America/Guayaquil',
    operatingDayStart,
    operatingDayEnd,
  };
}
