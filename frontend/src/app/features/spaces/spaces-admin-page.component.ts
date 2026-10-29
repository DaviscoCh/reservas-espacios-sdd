import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpaceType } from '../availability/availability-api.service';
import { Space, SpacesAdminApiService } from './spaces-admin-api.service';

@Component({
  selector: 'app-spaces-admin-page',
  imports: [ReactiveFormsModule],
  templateUrl: './spaces-admin-page.component.html',
  styleUrl: './spaces-admin-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacesAdminPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(SpacesAdminApiService);

  protected readonly typeLabels: Record<SpaceType, string> = { sala: 'Sala', cancha: 'Cancha' };

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required]],
    type: ['sala' as SpaceType, [Validators.required]],
    capacity: [1, [Validators.required, Validators.min(1)]],
    location: ['', [Validators.required]],
  });

  protected readonly spaces = signal<Space[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly listError = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected submit(): void {
    this.message.set(null);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const data = { ...raw, name: raw.name.trim(), location: raw.location.trim() };
    if (data.name === '' || data.location === '') {
      this.formError.set('El nombre y la ubicación no pueden estar vacíos.');
      return;
    }

    const id = this.editingId();
    const request = id === null ? this.api.create(data) : this.api.update(id, data);
    this.saving.set(true);
    request.subscribe({
      next: (space) => {
        this.saving.set(false);
        this.message.set(id === null ? `Espacio creado: ${space.name}.` : `Espacio actualizado: ${space.name}.`);
        this.resetForm();
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageFor(error, 'No se pudo guardar el espacio.'));
      },
    });
  }

  protected edit(space: Space): void {
    this.message.set(null);
    this.formError.set(null);
    this.confirmingId.set(null);
    this.editingId.set(space.id);
    this.form.setValue({
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      location: space.location,
    });
  }

  protected cancelEdit(): void {
    this.formError.set(null);
    this.resetForm();
  }

  protected askDeactivate(space: Space): void {
    this.message.set(null);
    this.confirmingId.set(space.id);
  }

  protected abortDeactivate(): void {
    this.confirmingId.set(null);
  }

  protected deactivate(space: Space): void {
    this.api.update(space.id, { isActive: false }).subscribe({
      next: () => {
        this.confirmingId.set(null);
        this.message.set(`Espacio desactivado: ${space.name}. Ya no aparece en la disponibilidad.`);
        if (this.editingId() === space.id) {
          this.resetForm();
        }
        this.load();
      },
      error: (error: unknown) => {
        this.confirmingId.set(null);
        this.message.set(this.messageFor(error, 'No se pudo desactivar el espacio.'));
      },
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', type: 'sala', capacity: 1, location: '' });
  }

  private load(): void {
    this.api.list().subscribe({
      next: (spaces) => {
        this.spaces.set(spaces);
        this.listError.set(null);
      },
      error: (error: unknown) => this.listError.set(this.messageFor(error, 'No se pudieron cargar los espacios.')),
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
