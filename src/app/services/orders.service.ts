import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';
import { ListCache } from './list-cache';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly base = environment.apiBaseUrl;
  private readonly ep = environment.apiEndpoints.orders;
  private readonly listCache = new ListCache<Order[]>();

  constructor(private http: HttpClient) {}

  getAll(status?: OrderStatus | '', force = false): Observable<Order[]> {
    const key = status?.trim() || 'all';
    if (force) this.listCache.invalidate(key);
    return this.listCache.get(key, () => {
      let params = new HttpParams();
      if (status?.trim()) {
        params = params.set('status', status.trim());
      }
      return this.http.get<Order[]>(`${this.base}${this.ep.getAll}`, { params });
    });
  }

  getById(id: string | number): Observable<Order> {
    return this.http.get<Order>(`${this.base}${this.ep.getById}/${id}`);
  }

  updateStatus(id: string | number, status: OrderStatus): Observable<string> {
    const url = `${this.base}${this.ep.updateStatus}/${id}`;
    const statusValues: Record<string, number> = {
      Pending: 0,
      Confirmed: 1,
      Processing: 2,
      Shipped: 3,
      Delivered: 4,
      Cancelled: 5
    };
    const payload = { status: statusValues[String(status)] };
    return this.http
      .put(url, payload, { responseType: 'text' })
      .pipe(this.listCache.tapInvalidate());
  }

  /** تحديث يدوي من زرار "تحديث" */
  refresh(status?: OrderStatus | ''): Observable<Order[]> {
    return this.getAll(status, true);
  }
}
