import type { Request, Response } from 'express';
import { getAvailability, parseAvailabilityDate } from '../services/spaces/availability.service';

/** GET /api/spaces/availability?date=YYYY-MM-DD → 200 { date, timezone, spaces }. */
export async function availabilityHandler(req: Request, res: Response): Promise<void> {
  const date = parseAvailabilityDate(req.query['date']);
  res.status(200).json(await getAvailability(date));
}
