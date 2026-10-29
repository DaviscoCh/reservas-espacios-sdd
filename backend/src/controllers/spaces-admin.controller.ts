import type { Request, Response } from 'express';
import {
  createSpace,
  listSpaces,
  parseActiveFilter,
  parseCreateSpaceInput,
  parseUpdateSpaceInput,
  updateSpace,
} from '../services/spaces/spaces-admin.service';

/** GET /api/spaces[?active=true|false] → 200 con la lista de espacios. */
export async function listSpacesHandler(req: Request, res: Response): Promise<void> {
  res.status(200).json(await listSpaces(parseActiveFilter(req.query['active'])));
}

/** POST /api/spaces → 201 con el espacio creado. */
export async function createSpaceHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createSpace(parseCreateSpaceInput(req.body)));
}

/** PATCH /api/spaces/:id → 200 con el espacio actualizado. */
export async function updateSpaceHandler(req: Request, res: Response): Promise<void> {
  const input = parseUpdateSpaceInput(req.body);
  res.status(200).json(await updateSpace(String(req.params['id']), input));
}
