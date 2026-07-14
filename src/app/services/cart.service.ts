import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly url = `${environment.apiBaseUrl}${environment.apiEndpoints.cart}`;

  constructor(private http: HttpClient) {}

  get(): Observable<unknown> {
    return this.http.get(this.url);
  }

  add(payload: unknown): Observable<unknown> {
    return this.http.post(this.url, payload);
  }

  update(payload: unknown): Observable<unknown> {
    return this.http.put(this.url, payload);
  }

  clear(): Observable<unknown> {
    return this.http.delete(this.url);
  }
}
