export interface Category {
  id?: string | number;
  name: string;
  count?: number;
  description?: string;
  imageUrl?: string;
  products?: unknown[];
  [key: string]: unknown;
}

export interface CategoryPayload {
  name: string;
  description?: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  brewingGuide?: string;
  categoryId?: number;
  categoryName?: string;
  imageUrls?: string[];
  /** ثامبنيل جاهز للجدول (مش من الـ API) */
  thumbUrl?: string | null;
}

/** مطابق POST /api/Products/AddProduct */
export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  discount: number;
  brewingGuide: string;
  categoryId: number;
  categoryName?: string;
  imageUrls: string[];
}

export interface TeawareCategory {
  id?: string | number;
  name: string;
  count?: number;
  description?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface Teaware {
  id?: number;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  categoryId?: number;
  categoryName?: string;
  /** أسماء الباك الأصلية */
  teawareCategoryId?: number;
  teawareCategoryName?: string;
  imageUrl?: string;
  imageUrls?: string[];
  /** ثامبنيل جاهز للجدول (مش من الـ API) */
  thumbUrl?: string | null;
}

/** مطابق إضافة/تعديل الأداة في الباك */
export interface TeawarePayload {
  name: string;
  description: string;
  price: number;
  discount: number;
  teawareCategoryId: number;
  teawareCategoryName?: string;
  imageUrls: string[];
}

export interface SearchResult {
  products: Product[];
  teawares: Teaware[];
}

export interface Profile {
  id?: string | number;
  phone?: string;
  name?: string;
  fullName?: string;
  email?: string;
  [key: string]: unknown;
}
