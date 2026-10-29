import { getConfig } from '../../config/env';
import { ReservationModel } from '../../models/reservation.model';
import { SpaceModel, type SpaceType } from '../../models/space.model';
import { isValidLocalDate, toZonedIsoString } from '../../utils/datetime';
import { HttpError } from '../../utils/http-error';

export interface OccupiedSlot {
  startAt: string;
  endAt: string;
}

export interface SpaceAvailability {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
  occupiedSlots: OccupiedSlot[];
}

export interface AvailabilityResult {
  date: string;
  timezone: string;
  spaces: SpaceAvailability[];
}

/** Valida el parámetro ?date=YYYY-MM-DD; si falta o es inválido responde 400 (FR-019). */
export function parseAvailabilityDate(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest('La fecha es obligatoria (formato YYYY-MM-DD)');
  }
  const date = value.trim();
  if (!isValidLocalDate(date)) {
    throw HttpError.badRequest('La fecha no es válida; usa el formato YYYY-MM-DD');
  }
  return date;
}

/**
 * Espacios activos con sus horarios ocupados en una fecha local (FR-003, FR-004).
 * Solo cuentan las reservas activas: una reserva cancelada libera el horario (FR-014).
 */
export async function getAvailability(localDate: string): Promise<AvailabilityResult> {
  const { timezone } = getConfig();

  const spaces = await SpaceModel.find({ isActive: true }).lean();
  const reservations = await ReservationModel.find({
    localDate,
    status: 'activa',
    spaceId: { $in: spaces.map((space) => space._id) },
  })
    .sort({ startAt: 1 })
    .lean();

  const slotsBySpace = new Map<string, OccupiedSlot[]>();
  for (const reservation of reservations) {
    const key = String(reservation.spaceId);
    const slots = slotsBySpace.get(key) ?? [];
    slots.push({
      startAt: toZonedIsoString(reservation.startAt, timezone),
      endAt: toZonedIsoString(reservation.endAt, timezone),
    });
    slotsBySpace.set(key, slots);
  }

  return {
    date: localDate,
    timezone,
    spaces: spaces
      .map((space) => ({
        id: String(space._id),
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        location: space.location,
        occupiedSlots: slotsBySpace.get(String(space._id)) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}
