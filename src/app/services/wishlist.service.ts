import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly url = `${environment.apiBaseUrl}${environment.apiEndpoints.wishlist}`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<unknown> {
    return this.http.get(this.url);
  }

  add(payload: unknown): Observable<unknown> {
    return this.http.post(this.url, payload);
  }

  remove(id: string | number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
