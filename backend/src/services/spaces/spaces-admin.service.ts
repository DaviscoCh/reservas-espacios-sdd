import { SPACE_TYPES, SpaceModel, type SpaceDocument, type SpaceType } from '../../models/space.model';
import { HttpError } from '../../utils/http-error';
import { isObjectIdString } from '../reservations/reservations-validation.service';

export interface SpaceView {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
  isActive: boolean;
}

export interface CreateSpaceInput {
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
}

export interface UpdateSpaceInput {
  name?: string;
  type?: SpaceType;
  capacity?: number;
  location?: string;
  isActive?: boolean;
}

const MAX_TEXT_LENGTH = 100;

function toView(space: SpaceDocument): SpaceView {
  return {
    id: String(space._id),
    name: space.name,
    type: space.type,
    capacity: space.capacity,
    location: space.location,
    isActive: space.isActive,
  };
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest(`${label} es obligatorio`);
  }
  if (value.trim().length > MAX_TEXT_LENGTH) {
    throw HttpError.badRequest(`${label} no puede superar los ${MAX_TEXT_LENGTH} caracteres`);
  }
  return value.trim();
}

function requireType(value: unknown): SpaceType {
  if (typeof value !== 'string' || !(SPACE_TYPES as readonly string[]).includes(value)) {
    throw HttpError.badRequest('El tipo debe ser sala o cancha');
  }
  return value as SpaceType;
}

function requireCapacity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw HttpError.badRequest('La capacidad debe ser un número entero mayor que cero');
  }
  return value;
}

function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('Debes enviar los datos del espacio');
  }
  return body as Record<string, unknown>;
}

/** Valida el alta de un espacio (FR-015, FR-019): todo se valida antes de guardar. */
export function parseCreateSpaceInput(body: unknown): CreateSpaceInput {
  const data = requireObject(body);
  return {
    name: requireText(data['name'], 'El nombre'),
    type: requireType(data['type']),
    capacity: requireCapacity(data['capacity']),
    location: requireText(data['location'], 'La ubicación'),
  };
}

/** Valida la edición de un espacio (FR-016, FR-017): al menos un dato y todos válidos, sin cambios parciales. */
export function parseUpdateSpaceInput(body: unknown): UpdateSpaceInput {
  const data = requireObject(body);
  const input: UpdateSpaceInput = {};

  if ('name' in data) input.name = requireText(data['name'], 'El nombre');
  if ('type' in data) input.type = requireType(data['type']);
  if ('capacity' in data) input.capacity = requireCapacity(data['capacity']);
  if ('location' in data) input.location = requireText(data['location'], 'La ubicación');
  if ('isActive' in data) {
    if (typeof data['isActive'] !== 'boolean') {
      throw HttpError.badRequest('El estado debe ser verdadero o falso');
    }
    input.isActive = data['isActive'];
  }

  if (Object.keys(input).length === 0) {
    throw HttpError.badRequest('Indica al menos un dato para modificar');
  }
  return input;
}

/** Filtro opcional ?active=true|false del listado; cualquier otro valor responde 400. */
export function parseActiveFilter(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw HttpError.badRequest('El filtro active debe ser true o false');
}

export async function createSpace(input: CreateSpaceInput): Promise<SpaceView> {
  return toView(await SpaceModel.create(input));
}

/** Lista los espacios ordenados por nombre; `active` filtra por estado (uso administrativo). */
export async function listSpaces(active?: boolean): Promise<SpaceView[]> {
  const spaces = await SpaceModel.find(active === undefined ? {} : { isActive: active });
  return spaces.map(toView).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Edita un espacio. La desactivación es lógica: el espacio y sus reservas se conservan, pero ya no
 * admite reservas nuevas ni aparece en la disponibilidad. En esta versión no se reactiva (409).
 */
export async function updateSpace(id: string, input: UpdateSpaceInput): Promise<SpaceView> {
  if (!isObjectIdString(id)) {
    throw HttpError.notFound('El espacio no existe');
  }
  const space = await SpaceModel.findById(id);
  if (!space) {
    throw HttpError.notFound('El espacio no existe');
  }
  if (input.isActive === true && !space.isActive) {
    throw HttpError.conflict('Un espacio desactivado no puede reactivarse en esta versión');
  }

  if (input.name !== undefined) space.name = input.name;
  if (input.type !== undefined) space.type = input.type;
  if (input.capacity !== undefined) space.capacity = input.capacity;
  if (input.location !== undefined) space.location = input.location;
  if (input.isActive !== undefined) space.isActive = input.isActive;

  await space.save();
  return toView(space);
}
