import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate-jwt';
import { parseReservationRequest } from '../services/reservations/reservations-validation.service';
import { cancelReservation, createReservation, getMyReservations } from '../services/reservations/reservations.service';

/** POST /api/reservations → 201 con la reserva activa creada. */
export async function createReservationHandler(req: Request, res: Response): Promise<void> {
  const { id } = getAuthUser(res);
  const input = parseReservationRequest(req.body);
  res.status(201).json(await createReservation(id, input));
}

/** GET /api/reservations/me → 200 con las reservas del usuario autenticado. */
export async function myReservationsHandler(_req: Request, res: Response): Promise<void> {
  const { id } = getAuthUser(res);
  res.status(200).json(await getMyReservations(id));
}

/** PATCH /api/reservations/:id/cancel → 200 con la reserva cancelada. */
export async function cancelReservationHandler(req: Request, res: Response): Promise<void> {
  const { id } = getAuthUser(res);
  res.status(200).json(await cancelReservation(id, String(req.params['id'])));
}
