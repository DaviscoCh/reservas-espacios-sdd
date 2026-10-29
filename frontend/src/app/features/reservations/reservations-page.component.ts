import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AvailabilityApiService, SpaceAvailability } from '../availability/availability-api.service';
import { todayInTimezone } from '../availability/availability-page.component';
import { Reservation, ReservationsApiService } from './reservations-api.service';

@Component({
  selector: 'app-reservations-page',
  imports: [ReactiveFormsModule],
  templateUrl: './reservations-page.component.html',
  styleUrl: './reservations-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly availabilityApi = inject(AvailabilityApiService);
  private readonly reservationsApi = inject(ReservationsApiService);
  private spacesRequest = 0;

  protected readonly operatingStart = environment.operatingDayStart;
  protected readonly operatingEnd = environment.operatingDayEnd;

  protected readonly form = this.formBuilder.group({
    date: [todayInTimezone(environment.appTimezone), [Validators.required]],
    spaceId: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
  });

  protected readonly spaces = signal<SpaceAvailability[]>([]);
  protected readonly selectedSpaceId = signal('');
  protected readonly selectedSpace = computed(
    () => this.spaces().find((space) => space.id === this.selectedSpaceId()) ?? null,
  );
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly listError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly cancelMessage = signal<string | null>(null);
  protected readonly cancellingId = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.form.controls.date.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((date) => {
      this.form.controls.spaceId.setValue('');
      this.selectedSpaceId.set('');
      this.loadSpaces(date);
    });
    this.form.controls.spaceId.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((id) => this.selectedSpaceId.set(id));

    this.loadSpaces(this.form.controls.date.value);
    this.loadReservations();
  }

  protected submit(): void {
    this.successMessage.set(null);
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.endTime <= value.startTime) {
      this.formError.set('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    this.submitting.set(true);
    this.reservationsApi.create(value).subscribe({
      next: (reservation) => {
        this.submitting.set(false);
        this.successMessage.set(
          `Reserva creada: ${reservation.spaceName}, ${reservation.date}, ${this.timeRange(reservation)}.`,
        );
        this.form.controls.startTime.reset('');
        this.form.controls.endTime.reset('');
        this.loadReservations();
        this.loadSpaces(value.date, value.spaceId);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(this.messageFor(error, 'No se pudo crear la reserva.'));
      },
    });
  }

  protected cancel(reservation: Reservation): void {
    this.cancelMessage.set(null);
    this.cancellingId.set(reservation.id);
    this.reservationsApi.cancel(reservation.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.formError.set(null);
        this.cancelMessage.set(`Reserva cancelada: ${reservation.spaceName}, ${reservation.date}, ${this.timeRange(reservation)}.`);
        this.loadReservations();
        this.loadSpaces(this.form.controls.date.value, this.form.controls.spaceId.value);
      },
      error: (error: unknown) => {
        this.cancellingId.set(null);
        this.cancelMessage.set(this.messageFor(error, 'No se pudo cancelar la reserva.'));
        this.loadReservations();
      },
    });
  }

  protected timeRange(item: { startAt: string; endAt: string }): string {
    return `${item.startAt.slice(11, 16)} – ${item.endAt.slice(11, 16)}`;
  }

  private loadSpaces(date: string, keepSpaceId = ''): void {
    if (date === '') {
      this.spaces.set([]);
      return;
    }
    const request = ++this.spacesRequest;
    this.availabilityApi.getAvailability(date).subscribe({
      next: (result) => {
        if (request !== this.spacesRequest) {
          return; // llegó tarde: ya se pidió otra fecha
        }
        this.spaces.set(result.spaces);
        if (keepSpaceId !== '' && result.spaces.some((space) => space.id === keepSpaceId)) {
          this.form.controls.spaceId.setValue(keepSpaceId, { emitEvent: false });
          this.selectedSpaceId.set(keepSpaceId);
        }
      },
      error: () => {
        if (request === this.spacesRequest) {
          this.spaces.set([]);
        }
      },
    });
  }

  private loadReservations(): void {
    this.reservationsApi.listMine().subscribe({
      next: (items) => {
        this.reservations.set(items);
        this.listError.set(null);
      },
      error: (error: unknown) => this.listError.set(this.messageFor(error, 'No se pudieron cargar tus reservas.')),
    });
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor.';
      }
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string' && message.trim() !== '') {
        return message;
      }
    }
    return fallback;
  }
}
