import { pendingLockCount, withSpaceLock } from '../../src/services/locks/space-lock.service';

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('withSpaceLock (bloqueo en memoria por espacio)', () => {
  it('serializa las tareas del mismo espacio: la segunda espera a la primera', async () => {
    const events: string[] = [];

    const first = withSpaceLock('sala-1', async () => {
      events.push('A:inicio');
      await wait(30);
      events.push('A:fin');
    });
    const second = withSpaceLock('sala-1', async () => {
      events.push('B:inicio');
      events.push('B:fin');
    });

    await Promise.all([first, second]);
    expect(events).toEqual(['A:inicio', 'A:fin', 'B:inicio', 'B:fin']);
  });

  it('no bloquea entre espacios distintos', async () => {
    const events: string[] = [];

    const slow = withSpaceLock('sala-1', async () => {
      await wait(40);
      events.push('sala-1');
    });
    const fast = withSpaceLock('sala-2', async () => {
      events.push('sala-2');
    });

    await Promise.all([slow, fast]);
    expect(events).toEqual(['sala-2', 'sala-1']);
  });

  it('simula dos reservas simultáneas: solo una pasa la verificación de solapamiento', async () => {
    const saved: Array<{ start: number; end: number }> = [];

    const tryReserve = (start: number, end: number): Promise<'creada' | 'conflicto'> =>
      withSpaceLock('cancha-1', async () => {
        const overlaps = saved.some((r) => r.start < end && r.end > start);
        await wait(10); // simula el tiempo de consulta y guardado en base de datos
        if (overlaps) return 'conflicto';
        saved.push({ start, end });
        return 'creada';
      });

    const results = await Promise.all([tryReserve(8, 10), tryReserve(9, 11), tryReserve(8, 10)]);

    expect(results.filter((r) => r === 'creada')).toHaveLength(1);
    expect(results.filter((r) => r === 'conflicto')).toHaveLength(2);
    expect(saved).toHaveLength(1);
  });

  it('libera el bloqueo si la tarea falla y la siguiente continúa', async () => {
    const failing = withSpaceLock('sala-9', async () => {
      throw new Error('fallo de prueba');
    });
    await expect(failing).rejects.toThrow('fallo de prueba');

    await expect(withSpaceLock('sala-9', async () => 'ok')).resolves.toBe('ok');
  });

  it('no acumula entradas en memoria cuando no hay tareas pendientes', async () => {
    await withSpaceLock('sala-temp', async () => undefined);
    expect(pendingLockCount()).toBe(0);
  });
});
