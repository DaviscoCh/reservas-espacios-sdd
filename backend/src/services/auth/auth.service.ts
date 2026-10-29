import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { signToken } from '../../middleware/authenticate-jwt';
import { UserModel, type UserDocument, type UserRole } from '../../models/user.model';
import { HttpError } from '../../utils/http-error';

const BCRYPT_COST = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_LENGTH = 200;

export interface LoginInput {
  email: string;
  password: string;
}

/** Identidad mínima que se devuelve al cliente: nunca incluye passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

/** El correo se guarda y se busca en minúsculas y sin espacios en los extremos. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

/**
 * Valida el cuerpo de POST /api/auth/login. Los campos inválidos responden 400 (FR-019);
 * esta validación ocurre antes de consultar la base de datos.
 */
export function parseLoginInput(body: unknown): LoginInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('Debes enviar el correo y la contraseña');
  }
  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || email.trim() === '') {
    throw HttpError.badRequest('El correo es obligatorio');
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    throw HttpError.badRequest('El correo no tiene un formato válido');
  }
  if (typeof password !== 'string' || password === '') {
    throw HttpError.badRequest('La contraseña es obligatoria');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw HttpError.badRequest('La contraseña es demasiado larga');
  }
  return { email: normalizeEmail(email), password };
}

function toPublicUser(user: UserDocument): PublicUser {
  return { id: String(user._id), email: user.email, role: user.role };
}

// Hash de una contraseña inexistente: se compara cuando el correo no está registrado para que
// el tiempo de respuesta no revele si la cuenta existe.
let dummyHash: string | undefined;
function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync('contrasena-que-no-existe', BCRYPT_COST);
  return dummyHash;
}

/** Autentica con correo y contraseña. Credenciales inválidas responden 401 con un mensaje genérico. */
export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await UserModel.findOne({ email: normalizeEmail(input.email) }).select('+passwordHash');
  const matches = await bcrypt.compare(input.password, user?.passwordHash ?? getDummyHash());
  if (!user || !matches) {
    throw HttpError.unauthorized('Correo o contraseña incorrectos');
  }

  const publicUser = toPublicUser(user);
  return { token: signToken({ id: publicUser.id, role: publicUser.role }), user: publicUser };
}

/** Perfil mínimo de la cuenta autenticada (GET /api/auth/me). */
export async function getProfile(userId: string): Promise<PublicUser> {
  if (!Types.ObjectId.isValid(userId)) {
    throw HttpError.unauthorized();
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    throw HttpError.unauthorized('La cuenta ya no existe');
  }
  return toPublicUser(user);
}
