import { MonoTypeOperatorFunction, Observable, shareReplay, tap } from 'rxjs';

/**
 * كاش بسيط لقوائم الـ GET — يمنع إعادة طلب نفس الـ API مع كل تنقّل بين الصفحات.
 */
export class ListCache<T> {
  private cache$ = new Map<string, Observable<T>>();

  get(key: string, factory: () => Observable<T>): Observable<T> {
    const existing = this.cache$.get(key);
    if (existing) {
      return existing;
    }

    const shared$ = factory().pipe(
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cache$.set(key, shared$);
    return shared$;
  }

  /** يمسح كاش مفتاح معيّن أو كل الكاش */
  invalidate(key?: string): void {
    if (key) {
      this.cache$.delete(key);
      return;
    }
    this.cache$.clear();
  }

  /** بعد create/update/delete: امسح الكاش عشان الجاية تجيب بيانات جديدة */
  tapInvalidate<R>(key?: string): MonoTypeOperatorFunction<R> {
    return tap({
      next: () => this.invalidate(key),
      error: () => undefined
    });
  }
}
