import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SpaceType = 'sala' | 'cancha';

export interface OccupiedSlot {
  startAt: string;
  endAt: string;
}

export interface SpaceAvailability {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
  occupiedSlots: OccupiedSlot[];
}

export interface AvailabilityResult {
  date: string;
  timezone: string;
  spaces: SpaceAvailability[];
}

@Injectable({ providedIn: 'root' })
export class AvailabilityApiService {
  private readonly http = inject(HttpClient);

  getAvailability(date: string): Observable<AvailabilityResult> {
    return this.http.get<AvailabilityResult>(`${environment.apiBaseUrl}/spaces/availability`, {
      params: new HttpParams().set('date', date),
    });
  }
}
