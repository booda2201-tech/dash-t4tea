import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<unknown> {
    return this.http.get(`${this.base}/api/Wishlist/GetWishlist`);
  }

  add(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/api/Wishlist/Items`, payload);
  }

  remove(id: string | number): Observable<unknown> {
    return this.http.delete(`${this.base}/api/Wishlist/Items/${id}`);
  }
}
