import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../src/app';
import { getConfig } from '../../src/config/env';
import { signToken } from '../../src/middleware/authenticate-jwt';
import { UserModel } from '../../src/models/user.model';
import { hashPassword } from '../../src/services/auth/auth.service';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';

/** T038: contrato de POST /api/auth/login y GET /api/auth/me contra una instancia real de MongoDB. */
const PASSWORD = 'Secreto123';
const EMAIL = 'solicitante@organizacion.test';

describeWithDatabase('Contrato /api/auth (MongoDB real)', () => {
  let userId: string;

  beforeAll(async () => {
    await connectTestDatabase('auth-contract');
    await UserModel.init();
    const user = await UserModel.create({ email: EMAIL, passwordHash: await hashPassword(PASSWORD), role: 'solicitante' });
    userId = String(user._id);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  describe('POST /api/auth/login', () => {
    it('con credenciales válidas responde 200 con { token, user } y sin datos de la contraseña', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(200);
      expect(Object.keys(response.body).sort()).toEqual(['token', 'user']);
      expect(response.body.user).toEqual({ id: userId, email: EMAIL, role: 'solicitante' });
      expect(JSON.stringify(response.body)).not.toMatch(/password/i);
    });

    it('el token lleva sub, role y exp', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
      const payload = jwt.verify(response.body.token, getConfig().jwtSecret) as jwt.JwtPayload;

      expect(payload.sub).toBe(userId);
      expect(payload['role']).toBe('solicitante');
      expect(typeof payload.exp).toBe('number');
    });

    it('normaliza el correo (mayúsculas y espacios) antes de buscar la cuenta', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '  SOLICITANTE@Organizacion.TEST ', password: PASSWORD });
      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(EMAIL);
    });

    it('contraseña incorrecta y correo inexistente responden 401 con el mismo mensaje genérico', async () => {
      const wrongPassword = await request(app).post('/api/auth/login').send({ email: EMAIL, password: 'otra-clave' });
      const unknownEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nadie@organizacion.test', password: PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });
  });

  describe('GET /api/auth/me', () => {
    it('con un token válido responde 200 con id, email y role', async () => {
      const login = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: userId, email: EMAIL, role: 'solicitante' });
    });

    it('sin token responde 401', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
    });

    it.each([
      ['encabezado sin Bearer', 'Token abc'],
      ['token mal formado', 'Bearer no-es-un-jwt'],
    ])('%s responde 401', async (_caso, header) => {
      const response = await request(app).get('/api/auth/me').set('Authorization', header);
      expect(response.status).toBe(401);
    });

    it('un token vencido responde 401', async () => {
      const expired = jwt.sign({ role: 'solicitante' }, getConfig().jwtSecret, { subject: userId, expiresIn: -10 });
      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
      expect(response.status).toBe(401);
    });

    it('un token firmado con otra clave responde 401', async () => {
      const forged = jwt.sign({ role: 'administrador' }, 'otra-clave', { subject: userId, expiresIn: '1h' });
      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
      expect(response.status).toBe(401);
    });

    it('un token de una cuenta eliminada responde 401', async () => {
      const ghost = await UserModel.create({
        email: 'fantasma@organizacion.test',
        passwordHash: await hashPassword(PASSWORD),
        role: 'solicitante',
      });
      const token = signToken({ id: String(ghost._id), role: 'solicitante' });
      await UserModel.deleteOne({ _id: ghost._id });

      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    });
  });
});
