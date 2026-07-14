import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, SearchResult, Teaware } from '../models/catalog.model';
import { ApiResponseHelper } from './api-response.helper';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly url = `${environment.apiBaseUrl}${environment.apiEndpoints.search}`;

  constructor(
    private http: HttpClient,
    private apiHelper: ApiResponseHelper
  ) {}

  search(term = ''): Observable<SearchResult> {
    let params = new HttpParams();
    if (term.trim()) {
      params = params.set('q', term.trim());
    }

    return this.http.get<unknown>(this.url, { params }).pipe(
      map((res) => this.normalizeResult(res))
    );
  }

  private normalizeResult(payload: unknown): SearchResult {
    const obj = (payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const productsRaw = this.apiHelper.asArray<Record<string, unknown>>(
      obj['products'] ?? obj['Products'] ?? []
    );
    const teawaresRaw = this.apiHelper.asArray<Record<string, unknown>>(
      obj['teawares'] ?? obj['Teawares'] ?? []
    );

    return {
      products: productsRaw.map((p) => this.normalizeProduct(p)),
      teawares: teawaresRaw.map((t) => this.normalizeTeaware(t))
    };
  }

  private normalizeProduct(raw: Record<string, unknown>): Product {
    const category = raw['category'] as Record<string, unknown> | null | undefined;
    const categoryName =
      (raw['categoryName'] as string) ||
      (category?.['name'] as string) ||
      '';

    return {
      id: Number(raw['id']) || undefined,
      name: String(raw['name'] || ''),
      description: (raw['description'] as string) || '',
      price: Number(raw['price']) || 0,
      discount: Number(raw['discount']) || 0,
      brewingGuide: (raw['brewingGuide'] as string) || '',
      categoryId: Number(raw['categoryId'] ?? category?.['id']) || undefined,
      categoryName,
      imageUrls: this.apiHelper.extractImageUrls(raw)
    };
  }

  private normalizeTeaware(raw: Record<string, unknown>): Teaware {
    const category = (raw['teawareCategory'] || raw['category']) as
      | Record<string, unknown>
      | null
      | undefined;
    const categoryId =
      Number(raw['categoryId'] ?? raw['teawareCategoryId'] ?? category?.['id']) || undefined;
    const categoryName =
      (raw['categoryName'] as string) ||
      (raw['teawareCategoryName'] as string) ||
      (category?.['name'] as string) ||
      '';

    return {
      id: Number(raw['id']) || undefined,
      name: String(raw['name'] || ''),
      description: (raw['description'] as string) || '',
      price: Number(raw['price']) || 0,
      discount: Number(raw['discount']) || 0,
      categoryId,
      categoryName,
      teawareCategoryId: categoryId,
      teawareCategoryName: categoryName,
      imageUrls: this.apiHelper.extractImageUrls(raw)
    };
  }
}
