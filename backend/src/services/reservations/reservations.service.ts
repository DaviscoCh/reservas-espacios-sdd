import { Types } from 'mongoose';
import { ReservationModel, type ReservationStatus } from '../../models/reservation.model';
import { SpaceModel } from '../../models/space.model';
import { getConfig } from '../../config/env';
import { toZonedIsoString } from '../../utils/datetime';
import { HttpError } from '../../utils/http-error';
import { withSpaceLock } from '../locks/space-lock.service';
import {
  canonicalObjectId,
  isObjectIdString,
  validateReservationWindow,
  type ReservationRequest,
} from './reservations-validation.service';

export interface ReservationView {
  id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
}

interface ReservationRecord {
  _id: unknown;
  spaceId: unknown;
  localDate: string;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
}

function toView(reservation: ReservationRecord, spaceName: string): ReservationView {
  const { timezone } = getConfig();
  return {
    id: String(reservation._id),
    spaceId: String(reservation.spaceId),
    spaceName,
    date: reservation.localDate,
    startAt: toZonedIsoString(reservation.startAt, timezone),
    endAt: toZonedIsoString(reservation.endAt, timezone),
    status: reservation.status,
  };
}

function localTime(instant: Date): string {
  return toZonedIsoString(instant, getConfig().timezone).slice(11, 16);
}

/**
 * Crea una reserva para el solicitante (FR-005 a FR-011).
 * La verificación de solapamiento y el guardado se ejecutan dentro del bloqueo en memoria del
 * espacio, de modo que dos solicitudes simultáneas sobre el mismo `spaceId` no se intercalan:
 * la primera se guarda y la segunda encuentra el choque y recibe 409.
 * Limitación: el bloqueo solo protege dentro de una instancia del servidor.
 */
export async function createReservation(
  userId: string,
  input: ReservationRequest,
  now: Date = new Date(),
): Promise<ReservationView> {
  const { startAt, endAt } = validateReservationWindow(input.date, input.startTime, input.endTime, now);
  const spaceId = canonicalObjectId(input.spaceId);

  return withSpaceLock(spaceId, async () => {
    const space = await SpaceModel.findById(spaceId);
    if (!space) {
      throw HttpError.notFound('El espacio solicitado no existe');
    }
    if (!space.isActive) {
      throw HttpError.conflict('El espacio está desactivado y no admite nuevas reservas');
    }

    // Reserva activa del mismo espacio y fecha cuyo intervalo se cruza: existing.startAt < fin y existing.endAt > inicio.
    const clash = await ReservationModel.findOne({
      spaceId: new Types.ObjectId(spaceId),
      localDate: input.date,
      status: 'activa',
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (clash) {
      throw HttpError.conflict(
        `El espacio ya está reservado de ${localTime(clash.startAt)} a ${localTime(clash.endAt)}; elige otro horario`,
      );
    }

    const created = await ReservationModel.create({
      userId: new Types.ObjectId(userId),
      spaceId: new Types.ObjectId(spaceId),
      localDate: input.date,
      startAt,
      endAt,
    });
    return toView(created, space.name);
  });
}

/** Reservas del usuario autenticado, incluidas las canceladas, por inicio descendente (FR-012). */
export async function getMyReservations(userId: string): Promise<ReservationView[]> {
  const reservations = await ReservationModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ startAt: -1 })
    .lean();

  const spaceIds = [...new Set(reservations.map((reservation) => String(reservation.spaceId)))];
  const spaces = await SpaceModel.find({ _id: { $in: spaceIds } }).lean();
  const names = new Map(spaces.map((space) => [String(space._id), space.name]));

  return reservations.map((reservation) => toView(reservation, names.get(String(reservation.spaceId)) ?? ''));
}

/**
 * Cancela una reserva propia y activa (FR-013, FR-014). El cambio de estado es atómico, así que
 * dos cancelaciones simultáneas no pueden ambas tener éxito. 404 si no existe o es de otro usuario;
 * 409 si ya estaba cancelada.
 */
export async function cancelReservation(userId: string, reservationId: string): Promise<ReservationView> {
  if (!isObjectIdString(reservationId)) {
    throw HttpError.notFound('La reserva no existe');
  }
  const owner = new Types.ObjectId(userId);

  const cancelled = await ReservationModel.findOneAndUpdate(
    { _id: reservationId, userId: owner, status: 'activa' },
    { $set: { status: 'cancelada' } },
    { returnDocument: 'after' },
  );

  if (!cancelled) {
    const existing = await ReservationModel.findOne({ _id: reservationId, userId: owner });
    if (!existing) {
      throw HttpError.notFound('La reserva no existe');
    }
    throw HttpError.conflict('La reserva ya está cancelada');
  }

  const space = await SpaceModel.findById(cancelled.spaceId);
  return toView(cancelled, space?.name ?? '');
}
