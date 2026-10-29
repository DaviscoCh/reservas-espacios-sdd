import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReservationStatus = 'activa' | 'cancelada';

export interface Reservation {
  id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
}

export interface CreateReservationRequest {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/reservations`;

  create(request: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.baseUrl, request);
  }

  listMine(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.baseUrl}/me`);
  }

  cancel(id: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${encodeURIComponent(id)}/cancel`, {});
  }
}
