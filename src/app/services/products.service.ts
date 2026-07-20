import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, ProductPayload } from '../models/catalog.model';
import { ListCache } from './list-cache';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.products;
  private readonly cache = new ListCache<Product[]>();

  constructor(private http: HttpClient) {}

  getAll(force = false): Observable<Product[]> {
    if (force) this.cache.invalidate('all');
    return this.cache.get('all', () =>
      this.http.get<Product[]>(`${this.base}${this.ep.getAll}`)
    );
  }

  getById(id: string | number): Observable<Product> {
    return this.http.get<Product>(`${this.base}${this.ep.getById}/${id}`);
  }

  /**
   * POST AddProduct — form-data (Postman) ويدعم أكتر من صورة
   */
  create(payload: ProductPayload, imageFiles: File[] = []): Observable<Product> {
    const form = new FormData();
    form.append('name', payload.name ?? '');
    form.append('description', payload.description ?? '');
    form.append('price', String(payload.price ?? 0));
    form.append('discount', String(payload.discount ?? 0));
    form.append('brewingGuide', payload.brewingGuide ?? '');
    form.append('categoryId', String(payload.categoryId ?? ''));

    imageFiles.forEach((file, index) => {
      form.append('image', file, file.name || `image-${index + 1}.jpg`);
    });

    return this.http
      .post<Product>(`${this.base}${this.ep.add}`, form)
      .pipe(this.cache.tapInvalidate());
  }

  /**
   * PUT UpdateProduct — JSON فقط زي Postman
   * (form-data بيرجع 415 Unsupported Media Type)
   */
  update(
    id: string | number,
    payload: ProductPayload,
    existingImageUrls: string[] = []
  ): Observable<Product> {
    return this.http
      .put<Product>(`${this.base}${this.ep.update}/${id}`, {
        id: Number(id),
        name: payload.name,
        description: payload.description,
        price: payload.price,
        discount: payload.discount,
        brewingGuide: payload.brewingGuide,
        categoryId: payload.categoryId,
        imageUrls: existingImageUrls
      })
      .pipe(this.cache.tapInvalidate());
  }

  delete(id: string | number): Observable<unknown> {
    return this.http
      .delete(`${this.base}${this.ep.delete}/${id}`)
      .pipe(this.cache.tapInvalidate());
  }
}
