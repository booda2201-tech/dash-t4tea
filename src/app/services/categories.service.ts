import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, CategoryPayload } from '../models/catalog.model';
import { ListCache } from './list-cache';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.categories;
  private readonly cache = new ListCache<Category[]>();

  constructor(private http: HttpClient) {}

  getAll(force = false): Observable<Category[]> {
    if (force) this.cache.invalidate('all');
    return this.cache.get('all', () =>
      this.http.get<Category[]>(`${this.base}${this.ep.getAll}`)
    );
  }

  getById(id: string | number): Observable<Category> {
    return this.http.get<Category>(`${this.base}${this.ep.getById}/${id}`);
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.http
      .post<Category>(`${this.base}${this.ep.add}`, payload)
      .pipe(this.cache.tapInvalidate());
  }

  update(id: string | number, payload: CategoryPayload): Observable<Category> {
    return this.http
      .put<Category>(`${this.base}${this.ep.update}/${id}`, { ...payload, id })
      .pipe(this.cache.tapInvalidate());
  }

  delete(id: string | number): Observable<unknown> {
    return this.http
      .delete(`${this.base}${this.ep.delete}/${id}`)
      .pipe(this.cache.tapInvalidate());
  }
}
