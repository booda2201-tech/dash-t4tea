import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';

const TOKEN_KEY = 't4tea_token';
const USER_KEY = 't4tea_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiBaseUrl;
  private readonly endpoints = environment.apiEndpoints.auth;
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readUser());

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}${this.endpoints.login}`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}${this.endpoints.register}`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.base}${this.endpoints.logout}`, {}).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      })
    );
  }

  logoutAndRedirect(): void {
    this.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  getToken(): string | null {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    // لو التوكن متسجل ومعاه Bearer بالغلط، نشيله
    return trimmed.replace(/^Bearer\s+/i, '');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /** الأدوار الموجودة داخل الـ JWT (المصدر الحقيقي اللي الـ API بيتحقق منه) */
  getTokenRoles(): string[] {
    const payload = this.decodeTokenPayload();
    if (!payload) return [];

    const roles: string[] = [];
    const candidates = [
      payload['role'],
      payload['Role'],
      payload['roles'],
      payload['Roles'],
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        roles.push(value.trim());
      } else if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === 'string' && entry.trim()) {
            roles.push(entry.trim());
          }
        }
      }
    }

    return [...new Set(roles)];
  }

  hasAdminRole(): boolean {
    return this.getTokenRoles().some((role) => /admin/i.test(role));
  }

  /** كل الـ claims جوه التوكن (للتشخيص) */
  getTokenClaims(): Record<string, unknown> | null {
    return this.decodeTokenPayload();
  }

  getAuthDebugInfo(): {
    hasToken: boolean;
    roles: string[];
    isAdmin: boolean;
    userRole: string | undefined;
    claimsPreview: string;
  } {
    const user = this.getCurrentUser();
    const claims = this.getTokenClaims();
    const roles = this.getTokenRoles();
    return {
      hasToken: !!this.getToken(),
      roles,
      isAdmin: this.hasAdminRole(),
      userRole: user?.role ? String(user.role) : undefined,
      claimsPreview: claims
        ? Object.keys(claims)
            .map((k) => `${k}=${JSON.stringify(claims[k])}`)
            .join(' | ')
        : 'لا يمكن قراءة التوكن'
    };
  }

  private persistSession(res: AuthResponse): void {
    const token = this.extractToken(res);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    const user = this.extractUser(res) || {};
    const roles = this.getTokenRoles();
    if (roles.length && !user.role) {
      user.role = roles.join(', ');
    }

    if (user.role || user.userId || user.userName || user.phone || Object.keys(user).length) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  private extractToken(res: AuthResponse): string | null {
    const obj = res as Record<string, unknown>;
    const data = (obj['data'] || obj['Data']) as Record<string, unknown> | undefined;
    const result = (obj['result'] || obj['Result']) as Record<string, unknown> | undefined;

    const candidates = [
      obj['token'],
      obj['Token'],
      obj['accessToken'],
      obj['AccessToken'],
      obj['jwt'],
      obj['Jwt'],
      obj['access_token'],
      data?.['token'],
      data?.['Token'],
      data?.['accessToken'],
      data?.['AccessToken'],
      result?.['token'],
      result?.['Token'],
      result?.['accessToken'],
      result?.['AccessToken']
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim().replace(/^Bearer\s+/i, '');
      }
    }

    return null;
  }

  private extractUser(res: AuthResponse): AuthUser | null {
    const obj = res as Record<string, unknown>;
    const data = (obj['data'] || obj['Data']) as Record<string, unknown> | undefined;

    if (res.user) return res.user;
    if (res.data?.user) return res.data.user;
    if (data?.['user'] && typeof data['user'] === 'object') {
      return data['user'] as AuthUser;
    }

    const userId = res.userId ?? res.data?.userId ?? obj['UserId'] ?? data?.['UserId'] ?? data?.['userId'];
    const userName =
      res.userName ?? res.data?.userName ?? obj['UserName'] ?? data?.['UserName'] ?? data?.['userName'];
    const role = res.role ?? res.data?.role ?? obj['Role'] ?? data?.['Role'] ?? data?.['role'];

    if (userId || userName || role) {
      return {
        id: userId as string | number | undefined,
        userId: userId as string | number | undefined,
        userName: userName as string | undefined,
        role: role as string | undefined
      };
    }

    return null;
  }

  private decodeTokenPayload(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }
}
