import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvailabilityApiService,
  OccupiedSlot,
  SpaceAvailability,
} from './availability-api.service';

type LoadState = 'loading' | 'ready' | 'error';

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria operativa, no la del navegador. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

@Component({
  selector: 'app-availability-page',
  templateUrl: './availability-page.component.html',
  styleUrl: './availability-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityPageComponent {
  private readonly api = inject(AvailabilityApiService);
  private readonly requests = new Subject<string>();

  protected readonly date = signal(todayInTimezone(environment.appTimezone));
  protected readonly state = signal<LoadState>('loading');
  protected readonly spaces = signal<SpaceAvailability[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly operatingHours = `${environment.operatingDayStart}–${environment.operatingDayEnd}`;
  protected readonly typeLabels = { sala: 'Sala', cancha: 'Cancha' } as const;

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.state.set('loading');
          this.errorMessage.set(null);
        }),
        // switchMap descarta la respuesta de una fecha anterior si el usuario cambia de fecha rápido.
        switchMap((date) =>
          this.api.getAvailability(date).pipe(
            map((result) => ({ ok: true as const, spaces: result.spaces })),
            catchError((error: unknown) => of({ ok: false as const, message: this.messageFor(error) })),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((outcome) => {
        if (outcome.ok) {
          this.spaces.set(outcome.spaces);
          this.state.set('ready');
        } else {
          this.spaces.set([]);
          this.errorMessage.set(outcome.message);
          this.state.set('error');
        }
      });

    this.requests.next(this.date());
  }

  protected onDateChange(value: string): void {
    if (value === '') {
      return;
    }
    this.date.set(value);
    this.requests.next(value);
  }

  protected retry(): void {
    this.requests.next(this.date());
  }

  /** Los instantes llegan con el desfase local (p. ej. 2026-11-10T08:00:00-05:00): se toma HH:mm tal cual. */
  protected slotLabel(slot: OccupiedSlot): string {
    return `${slot.startAt.slice(11, 16)} – ${slot.endAt.slice(11, 16)}`;
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor.';
      }
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string' && message.trim() !== '') {
        return message;
      }
    }
    return 'No se pudo cargar la disponibilidad.';
  }
}
