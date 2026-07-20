import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Teaware, TeawarePayload } from '../models/catalog.model';
import { ListCache } from './list-cache';

@Injectable({ providedIn: 'root' })
export class TeawareService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.teawares;
  private readonly cache = new ListCache<Teaware[]>();

  constructor(private http: HttpClient) {}

  getAll(force = false): Observable<Teaware[]> {
    if (force) this.cache.invalidate('all');
    return this.cache.get('all', () =>
      this.http.get<Teaware[]>(`${this.base}${this.ep.getAll}`)
    );
  }

  getById(id: string | number): Observable<Teaware> {
    return this.http.get<Teaware>(`${this.base}${this.ep.getById}/${id}`);
  }

  create(payload: TeawarePayload): Observable<Teaware> {
    return this.http
      .post<Teaware>(`${this.base}${this.ep.add}`, payload)
      .pipe(this.cache.tapInvalidate());
  }

  update(id: string | number, payload: Partial<TeawarePayload> & { id?: number }): Observable<Teaware> {
    return this.http
      .put<Teaware>(`${this.base}${this.ep.update}/${id}`, { ...payload, id })
      .pipe(this.cache.tapInvalidate());
  }

  delete(id: string | number): Observable<unknown> {
    return this.http
      .delete(`${this.base}${this.ep.delete}/${id}`)
      .pipe(this.cache.tapInvalidate());
  }
}
