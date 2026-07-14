import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Teaware, TeawarePayload } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class TeawareService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.teawares;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Teaware[]> {
    return this.http.get<Teaware[]>(`${this.base}${this.ep.getAll}`);
  }

  getById(id: string | number): Observable<Teaware> {
    return this.http.get<Teaware>(`${this.base}${this.ep.getById}/${id}`);
  }

  create(payload: TeawarePayload): Observable<Teaware> {
    return this.http.post<Teaware>(`${this.base}${this.ep.add}`, payload);
  }

  update(id: string | number, payload: Partial<TeawarePayload> & { id?: number }): Observable<Teaware> {
    return this.http.put<Teaware>(`${this.base}${this.ep.update}/${id}`, { ...payload, id });
  }

  delete(id: string | number): Observable<unknown> {
    return this.http.delete(`${this.base}${this.ep.delete}/${id}`);
  }
}
