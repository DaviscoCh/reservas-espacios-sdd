export interface TimeInterval {
  startAt: Date;
  endAt: Date;
}

/**
 * Regla de no solapamiento (Ecuación 1 del artículo), con intervalos semiabiertos [inicio, fin):
 * dos reservas del mismo espacio se solapan cuando existing.startAt < new.endAt y
 * existing.endAt > new.startAt. Dos reservas consecutivas (fin == inicio) NO se solapan.
 */
export function intervalsOverlap(existing: TimeInterval, requested: TimeInterval): boolean {
  return existing.startAt.getTime() < requested.endAt.getTime() && existing.endAt.getTime() > requested.startAt.getTime();
}
