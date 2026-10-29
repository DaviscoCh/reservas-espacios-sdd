/**
 * Bloqueo en memoria por espacio (`spaceId`).
 *
 * Serializa las tareas que comparten el mismo identificador: la siguiente solo empieza cuando
 * termina la anterior. Se usa para que la verificación de solapamiento y el guardado de una
 * reserva se ejecuten como una sola operación, sin que otra solicitud sobre el mismo espacio
 * se intercale entre ambas.
 *
 * LIMITACIÓN: el estado vive en la memoria del proceso, por lo que solo protege dentro de una
 * única instancia del servidor. Con varias instancias se necesita un bloqueo distribuido
 * (por ejemplo, un lock en base de datos o Redis).
 */
const queueTails = new Map<string, Promise<void>>();

export async function withSpaceLock<T>(spaceId: string, task: () => Promise<T>): Promise<T> {
  const previous = queueTails.get(spaceId) ?? Promise.resolve();

  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  queueTails.set(spaceId, tail);

  await previous;
  try {
    return await task();
  } finally {
    release();
    // Si nadie más se encoló detrás de esta tarea, se libera la entrada para no acumular memoria.
    if (queueTails.get(spaceId) === tail) {
      queueTails.delete(spaceId);
    }
  }
}

/** Cantidad de espacios con tareas pendientes; útil para pruebas. */
export function pendingLockCount(): number {
  return queueTails.size;
}
