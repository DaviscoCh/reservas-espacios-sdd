import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { getConfig } from '../../src/config/env';
import { UserModel } from '../../src/models/user.model';
import { getProfile, hashPassword, login, normalizeEmail, parseLoginInput } from '../../src/services/auth/auth.service';
import { HttpError } from '../../src/utils/http-error';

/** Lógica del servicio de autenticación sin base de datos: UserModel se reemplaza por dobles. */
function mockFindOne(result: unknown) {
  return jest.spyOn(UserModel, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue(result) } as never);
}

async function fakeUser(password: string) {
  return {
    _id: new Types.ObjectId(),
    email: 'admin@organizacion.test',
    role: 'administrador',
    passwordHash: await hashPassword(password),
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('servicio de autenticación', () => {
  it('normalizeEmail recorta espacios y pasa a minúsculas', () => {
    expect(normalizeEmail('  Ana@Test.COM ')).toBe('ana@test.com');
  });

  it('parseLoginInput normaliza el correo y conserva la contraseña tal cual', () => {
    expect(parseLoginInput({ email: '  Ana@Test.com ', password: ' clave ' })).toEqual({
      email: 'ana@test.com',
      password: ' clave ',
    });
  });

  it('login con credenciales válidas devuelve un token con sub y role, y el perfil mínimo', async () => {
    const user = await fakeUser('Secreto123');
    const findOne = mockFindOne(user);

    const result = await login({ email: 'Admin@Organizacion.test', password: 'Secreto123' });

    expect(findOne).toHaveBeenCalledWith({ email: 'admin@organizacion.test' });
    expect(result.user).toEqual({ id: String(user._id), email: user.email, role: 'administrador' });
    const payload = jwt.verify(result.token, getConfig().jwtSecret) as jwt.JwtPayload;
    expect(payload.sub).toBe(String(user._id));
    expect(payload['role']).toBe('administrador');
    expect(payload.exp).toBeDefined();
  });

  it('login con contraseña incorrecta responde 401', async () => {
    mockFindOne(await fakeUser('Secreto123'));
    await expect(login({ email: 'admin@organizacion.test', password: 'otra' })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('login con un correo inexistente responde 401 y aun así compara contra un hash', async () => {
    mockFindOne(null);
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(login({ email: 'nadie@organizacion.test', password: 'Secreto123' })).rejects.toBeInstanceOf(HttpError);
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('getProfile rechaza un identificador inválido con 401', async () => {
    await expect(getProfile('no-es-un-id')).rejects.toMatchObject({ status: 401 });
  });

  it('getProfile responde 401 si la cuenta ya no existe', async () => {
    jest.spyOn(UserModel, 'findById').mockResolvedValue(null as never);
    await expect(getProfile(String(new Types.ObjectId()))).rejects.toMatchObject({ status: 401 });
  });

  it('getProfile devuelve solo id, email y role', async () => {
    const user = await fakeUser('Secreto123');
    jest.spyOn(UserModel, 'findById').mockResolvedValue(user as never);

    const profile = await getProfile(String(user._id));
    expect(profile).toEqual({ id: String(user._id), email: user.email, role: 'administrador' });
  });
});
