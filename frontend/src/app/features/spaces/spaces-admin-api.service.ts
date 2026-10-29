import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SpaceType } from '../availability/availability-api.service';

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
  isActive: boolean;
}

export interface SpaceData {
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
}

@Injectable({ providedIn: 'root' })
export class SpacesAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/spaces`;

  list(): Observable<Space[]> {
    return this.http.get<Space[]>(this.baseUrl);
  }

  create(data: SpaceData): Observable<Space> {
    return this.http.post<Space>(this.baseUrl, data);
  }

  update(id: string, changes: Partial<SpaceData> & { isActive?: false }): Observable<Space> {
    return this.http.patch<Space>(`${this.baseUrl}/${encodeURIComponent(id)}`, changes);
  }
}
