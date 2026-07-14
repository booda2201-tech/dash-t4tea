import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/** يوحّد ردود الـ API اللي بتيجي Array أو جوا data/items/result */
@Injectable({ providedIn: 'root' })
export class ApiResponseHelper {
  asArray<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      for (const key of ['data', 'items', 'result', 'results', 'value']) {
        if (Array.isArray(obj[key])) {
          return obj[key] as T[];
        }
      }
    }

    return [];
  }

  /** يستخرج روابط الصور من أشكال مختلفة للـ API */
  extractImageUrls(item: Record<string, unknown> | null | undefined): string[] {
    if (!item) return [];

    const candidates = [
      item['imageUrls'],
      item['ImageUrls'],
      item['images'],
      item['Images'],
      item['imageUrl'],
      item['ImageUrl'],
      item['image'],
      item['Image']
    ];

    const urls: string[] = [];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const entry of candidate) {
          const url = this.normalizeImageUrl(entry);
          if (url) urls.push(url);
        }
      } else {
        const url = this.normalizeImageUrl(candidate);
        if (url) urls.push(url);
      }
    }

    return [...new Set(urls)];
  }

  getThumbUrl(
    item: { imageUrls?: string[]; imageUrl?: string } | null | undefined,
    size = 96
  ): string | null {
    if (!item) return null;
    const fromArray = item.imageUrls?.[0];
    if (fromArray) return this.toThumbUrl(fromArray, size);
    if (item.imageUrl) return this.toThumbUrl(item.imageUrl, size);
    return null;
  }

  /** يصغّر صور Unsplash / Picsum عشان الثامبنيلز متتقلّش الصفحة */
  toThumbUrl(url: string | null | undefined, size = 96): string | null {
    const normalized = this.normalizeImageUrl(url);
    if (!normalized) return null;
    if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
      return normalized;
    }

    try {
      const parsed = new URL(normalized, window.location.origin);

      if (parsed.hostname.includes('images.unsplash.com')) {
        parsed.searchParams.set('w', String(size));
        parsed.searchParams.set('h', String(size));
        parsed.searchParams.set('fit', 'crop');
        parsed.searchParams.set('q', '60');
        parsed.searchParams.set('auto', 'format');
        return parsed.toString();
      }

      if (parsed.hostname.includes('picsum.photos')) {
        // /600/600?random=7 → /96/96?random=7
        parsed.pathname = parsed.pathname.replace(/\/\d+\/\d+/, `/${size}/${size}`);
        return parsed.toString();
      }
    } catch {
      return normalized;
    }

    return normalized;
  }

  private normalizeImageUrl(value: unknown): string | null {
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const nested = obj['url'] ?? obj['Url'] ?? obj['imageUrl'] ?? obj['ImageUrl'];
      return this.normalizeImageUrl(nested);
    }

    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `${environment.apiBaseUrl || ''}${trimmed}`;
    }

    return trimmed;
  }
}
