import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Profile } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly url = `${environment.apiBaseUrl}${environment.apiEndpoints.profile}`;

  constructor(private http: HttpClient) {}

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.url);
  }

  update(payload: Partial<Profile>): Observable<Profile> {
    return this.http.put<Profile>(this.url, payload);
  }
}
