import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, ProductPayload } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.products;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}${this.ep.getAll}`);
  }

  getById(id: string | number): Observable<Product> {
    return this.http.get<Product>(`${this.base}${this.ep.getById}/${id}`);
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.base}${this.ep.add}`, payload);
  }

  update(id: string | number, payload: Partial<ProductPayload> & { id?: number }): Observable<Product> {
    return this.http.put<Product>(`${this.base}${this.ep.update}/${id}`, { ...payload, id });
  }

  delete(id: string | number): Observable<unknown> {
    return this.http.delete(`${this.base}${this.ep.delete}/${id}`);
  }
}
