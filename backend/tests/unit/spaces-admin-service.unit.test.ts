import { Types } from 'mongoose';
import { SpaceModel } from '../../src/models/space.model';
import {
  parseActiveFilter,
  parseCreateSpaceInput,
  parseUpdateSpaceInput,
  updateSpace,
} from '../../src/services/spaces/spaces-admin.service';

/** T048: reglas de validación y desactivación lógica, sin base de datos. */
const validSpace = { name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' };
const badRequest = expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('parseCreateSpaceInput', () => {
  it('acepta un espacio válido y recorta los textos', () => {
    expect(parseCreateSpaceInput({ ...validSpace, name: '  Sala Norte ', location: ' Edificio A ' })).toEqual(validSpace);
  });

  it.each([
    ['sin cuerpo', undefined],
    ['un arreglo', []],
    ['sin nombre', { ...validSpace, name: undefined }],
    ['con un nombre en blanco', { ...validSpace, name: '   ' }],
    ['con un nombre demasiado largo', { ...validSpace, name: 'x'.repeat(101) }],
    ['sin tipo', { ...validSpace, type: undefined }],
    ['con un tipo desconocido', { ...validSpace, type: 'auditorio' }],
    ['con capacidad cero', { ...validSpace, capacity: 0 }],
    ['con capacidad negativa', { ...validSpace, capacity: -5 }],
    ['con capacidad decimal', { ...validSpace, capacity: 10.5 }],
    ['con capacidad como texto', { ...validSpace, capacity: '20' }],
    ['sin ubicación', { ...validSpace, location: undefined }],
    ['con una ubicación en blanco', { ...validSpace, location: '' }],
  ])('rechaza con 400 un espacio %s', (_caso, body) => {
    expect(() => parseCreateSpaceInput(body)).toThrow(badRequest);
  });
});

describe('parseUpdateSpaceInput', () => {
  it('acepta un cambio parcial con uno o varios campos', () => {
    expect(parseUpdateSpaceInput({ capacity: 30 })).toEqual({ capacity: 30 });
    expect(parseUpdateSpaceInput({ name: ' Sala Sur ', isActive: false })).toEqual({ name: 'Sala Sur', isActive: false });
  });

  it.each([
    ['vacío', {}],
    ['sin ningún campo editable', { id: 'x', createdAt: 'hoy' }],
    ['con un nombre en blanco', { name: ' ' }],
    ['con un tipo inválido', { type: 'estadio' }],
    ['con capacidad inválida', { capacity: 0 }],
    ['con un estado que no es booleano', { isActive: 'false' }],
  ])('rechaza con 400 un cambio %s', (_caso, body) => {
    expect(() => parseUpdateSpaceInput(body)).toThrow(badRequest);
  });

  it('un cambio con un dato válido y otro inválido se rechaza completo', () => {
    expect(() => parseUpdateSpaceInput({ name: 'Sala Nueva', capacity: -1 })).toThrow(badRequest);
  });
});

describe('parseActiveFilter', () => {
  it('interpreta true, false y la ausencia del filtro', () => {
    expect(parseActiveFilter('true')).toBe(true);
    expect(parseActiveFilter('false')).toBe(false);
    expect(parseActiveFilter(undefined)).toBeUndefined();
  });

  it.each(['si', '1', ['true', 'false']])('rechaza %p con 400', (value) => {
    expect(() => parseActiveFilter(value)).toThrow(badRequest);
  });
});

describe('updateSpace', () => {
  function fakeSpace(isActive: boolean) {
    return {
      _id: new Types.ObjectId(),
      name: 'Sala Norte',
      type: 'sala',
      capacity: 20,
      location: 'Edificio A',
      isActive,
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('responde 404 si el identificador es inválido o el espacio no existe', async () => {
    await expect(updateSpace('no-es-un-id', { name: 'X' })).rejects.toMatchObject({ status: 404 });
    jest.spyOn(SpaceModel, 'findById').mockResolvedValue(null as never);
    await expect(updateSpace(String(new Types.ObjectId()), { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });

  it('aplica solo los campos enviados y guarda una vez', async () => {
    const space = fakeSpace(true);
    jest.spyOn(SpaceModel, 'findById').mockResolvedValue(space as never);

    const view = await updateSpace(String(space._id), { capacity: 35 });

    expect(view).toEqual({ id: String(space._id), name: 'Sala Norte', type: 'sala', capacity: 35, location: 'Edificio A', isActive: true });
    expect(space.save).toHaveBeenCalledTimes(1);
  });

  it('desactiva un espacio activo (desactivación lógica: no se elimina nada)', async () => {
    const space = fakeSpace(true);
    jest.spyOn(SpaceModel, 'findById').mockResolvedValue(space as never);
    const remove = jest.spyOn(SpaceModel, 'deleteOne');

    const view = await updateSpace(String(space._id), { isActive: false });

    expect(view.isActive).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('no reactiva un espacio desactivado y responde 409 sin guardar', async () => {
    const space = fakeSpace(false);
    jest.spyOn(SpaceModel, 'findById').mockResolvedValue(space as never);

    await expect(updateSpace(String(space._id), { isActive: true, name: 'Otro' })).rejects.toMatchObject({ status: 409 });
    expect(space.save).not.toHaveBeenCalled();
    expect(space.name).toBe('Sala Norte');
  });
});
