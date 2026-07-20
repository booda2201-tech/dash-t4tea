import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TeawareCategory } from '../models/catalog.model';
import { ListCache } from './list-cache';

@Injectable({ providedIn: 'root' })
export class TeawareCategoriesService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.teawareCategories;
  private readonly cache = new ListCache<TeawareCategory[]>();

  constructor(private http: HttpClient) {}

  getAll(force = false): Observable<TeawareCategory[]> {
    if (force) this.cache.invalidate('all');
    return this.cache.get('all', () =>
      this.http.get<TeawareCategory[]>(`${this.base}${this.ep.getAll}`)
    );
  }

  getById(id: string | number): Observable<TeawareCategory> {
    return this.http.get<TeawareCategory>(`${this.base}${this.ep.getById}/${id}`);
  }

  create(payload: Partial<TeawareCategory>): Observable<TeawareCategory> {
    return this.http
      .post<TeawareCategory>(`${this.base}${this.ep.add}`, payload)
      .pipe(this.cache.tapInvalidate());
  }

  update(id: string | number, payload: Partial<TeawareCategory>): Observable<TeawareCategory> {
    return this.http
      .put<TeawareCategory>(`${this.base}${this.ep.update}/${id}`, payload)
      .pipe(this.cache.tapInvalidate());
  }

  delete(id: string | number): Observable<unknown> {
    return this.http
      .delete(`${this.base}${this.ep.delete}/${id}`)
      .pipe(this.cache.tapInvalidate());
  }
}
