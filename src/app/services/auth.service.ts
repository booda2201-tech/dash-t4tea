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
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private persistSession(res: AuthResponse): void {
    const token = this.extractToken(res);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    const user = this.extractUser(res);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  private extractToken(res: AuthResponse): string | null {
    return (
      res.token ||
      res.accessToken ||
      res.jwt ||
      res.data?.token ||
      res.data?.accessToken ||
      null
    );
  }

  private extractUser(res: AuthResponse): AuthUser | null {
    if (res.user) return res.user;
    if (res.data?.user) return res.data.user;

    if (res.userId || res.userName || res.role || res.data?.userId) {
      return {
        id: res.userId ?? res.data?.userId,
        userId: res.userId ?? res.data?.userId,
        userName: res.userName ?? res.data?.userName,
        role: res.role ?? res.data?.role
      };
    }

    return null;
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
