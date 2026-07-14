import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { gsap } from 'gsap';
import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  forkJoin
} from 'rxjs';
import { ProductsService } from '../../services/products.service';
import { TeawareService } from '../../services/teaware.service';
import { CategoriesService } from '../../services/categories.service';
import { TeawareCategoriesService } from '../../services/teaware-categories.service';
import { SearchService } from '../../services/search.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { ImageDropzoneComponent } from '../shared/image-dropzone/image-dropzone.component';
import {
  Category,
  Product,
  ProductPayload,
  Teaware,
  TeawareCategory,
  TeawarePayload
} from '../../models/catalog.model';

interface DashboardItem {
  id: string | number;
  name: string;
  category: string;
  categoryId?: string | number;
  type: 'Tea' | 'Teaware';
  price: number;
  discount?: number;
  description?: string;
  brewingGuide?: string;
  imageUrls?: string[];
  thumbUrl?: string | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImageDropzoneComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly latestLimit = 4;

  isModalOpen = false;
  modalTitle = '';
  modalMode: 'add' | 'edit' = 'add';
  isLoading = false;
  isSaving = false;

  searchQuery = '';
  isSearching = false;
  hasSearched = false;
  searchResults: DashboardItem[] = [];

  categories: Category[] = [];
  teawareCategories: TeawareCategory[] = [];

  currentItem = this.emptyForm();
  dashboardItems: DashboardItem[] = [];
  latestItems: DashboardItem[] = [];

  private readonly searchTerm$ = new Subject<string>();
  private searchSub?: Subscription;

  constructor(
    private toastr: ToastrService,
    private productsService: ProductsService,
    private teawareService: TeawareService,
    private categoriesService: CategoriesService,
    private teawareCategoriesService: TeawareCategoriesService,
    private searchService: SearchService,
    private apiHelper: ApiResponseHelper
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadDashboard();
    this.bindSearch();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  private bindSearch(): void {
    this.searchSub = this.searchTerm$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe({
        next: (term) => {
          const q = term.trim().toLowerCase();
          if (!q) {
            this.hasSearched = false;
            this.searchResults = [];
            this.isSearching = false;
            return;
          }

          this.hasSearched = true;
          this.isSearching = false;
          this.searchResults = this.filterItems(this.dashboardItems, q);

          // لو البيانات لسه متحمّلتش، جرّب الـ API وبعدين فلتر محلياً
          if (!this.dashboardItems.length) {
            this.isSearching = true;
            this.searchService.search(term.trim()).subscribe({
              next: (res) => {
                const mapped = [
                  ...this.mapProducts(res.products || []),
                  ...this.mapTeawares(res.teawares || [])
                ];
                this.searchResults = this.filterItems(mapped, q);
                this.isSearching = false;
              },
              error: () => {
                this.isSearching = false;
                this.searchResults = [];
                this.toastr.error('تعذر تنفيذ البحث');
              }
            });
          }
        }
      });
  }

  private filterItems(items: DashboardItem[], q: string): DashboardItem[] {
    return items.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const brewing = (item.brewingGuide || '').toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        description.includes(q) ||
        brewing.includes(q)
      );
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchTerm$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchTerm$.next('');
  }

  get isSearchMode(): boolean {
    return this.hasSearched && !!this.searchQuery.trim();
  }

  get displayedItems(): DashboardItem[] {
    return this.isSearchMode ? this.searchResults : this.latestItems;
  }

  get activeCategories(): Array<Category | TeawareCategory> {
    return this.currentItem.type === 'Tea' ? this.categories : this.teawareCategories;
  }

  loadLookups(): void {
    this.categoriesService.getAll().subscribe({
      next: (res) => (this.categories = this.apiHelper.asArray<Category>(res)),
      error: () => (this.categories = [])
    });

    this.teawareCategoriesService.getAll().subscribe({
      next: (res) => (this.teawareCategories = this.apiHelper.asArray<TeawareCategory>(res)),
      error: () => (this.teawareCategories = [])
    });
  }

  loadDashboard(): void {
    this.isLoading = true;

    forkJoin({
      products: this.productsService.getAll(),
      teawares: this.teawareService.getAll()
    }).subscribe({
      next: ({ products, teawares }) => {
        this.dashboardItems = [
          ...this.mapProducts(this.apiHelper.asArray<Product>(products)),
          ...this.mapTeawares(this.apiHelper.asArray<Teaware>(teawares))
        ];
        this.updateLatestItems();
        if (this.searchQuery.trim()) {
          this.searchResults = this.filterItems(
            this.dashboardItems,
            this.searchQuery.trim().toLowerCase()
          );
        }
        this.isLoading = false;
        this.initLuxuryAnimations();
      },
      error: () => {
        this.searchService.search().subscribe({
          next: (res) => {
            this.dashboardItems = [
              ...this.mapProducts(res.products || []),
              ...this.mapTeawares(res.teawares || [])
            ];
            this.updateLatestItems();
            if (this.searchQuery.trim()) {
              this.searchResults = this.filterItems(
                this.dashboardItems,
                this.searchQuery.trim().toLowerCase()
              );
            }
            this.isLoading = false;
            this.initLuxuryAnimations();
          },
          error: () => {
            this.isLoading = false;
            this.dashboardItems = [];
            this.latestItems = [];
            this.toastr.error('تعذر تحميل بيانات لوحة التحكم من السيرفر');
          }
        });
      }
    });
  }

  /** أحدث منتجات من فئات مختلفة (مش كلهم من صنف واحد) */
  private updateLatestItems(): void {
    const teaItems = this.dashboardItems.filter((item) => item.type === 'Tea');
    const byCategory = new Map<string, DashboardItem[]>();

    for (const item of teaItems) {
      const key = String(item.categoryId ?? item.category ?? 'other');
      const list = byCategory.get(key) || [];
      list.push(item);
      byCategory.set(key, list);
    }

    const categoryQueues = [...byCategory.values()];
    const mixed: DashboardItem[] = [];

    // لفّة أولى: منتج واحد من كل فئة
    for (const queue of categoryQueues) {
      if (mixed.length >= this.latestLimit) break;
      const item = queue.shift();
      if (item) mixed.push(item);
    }

    // لفّات تانية لو لسه فيه أماكن فاضية
    let remaining = true;
    while (mixed.length < this.latestLimit && remaining) {
      remaining = false;
      for (const queue of categoryQueues) {
        if (mixed.length >= this.latestLimit) break;
        if (!queue.length) continue;
        const item = queue.shift();
        if (item) {
          mixed.push(item);
          remaining = true;
        }
      }
    }

    this.latestItems = mixed;
  }

  openModal(mode: 'add' | 'edit', item?: DashboardItem): void {
    this.modalMode = mode;
    this.isModalOpen = true;

    if (mode === 'edit' && item) {
      this.modalTitle = 'تعديل المنتج';
      this.currentItem = {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        discount: item.discount || 0,
        brewingGuide: item.brewingGuide || '',
        categoryId: item.categoryId ?? '',
        type: item.type,
        imageUrls: [...(item.imageUrls || [])]
      };
    } else {
      this.modalTitle = 'إضافة منتج جديد';
      this.currentItem = this.emptyForm();
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSaving = false;
  }

  onTypeChange(): void {
    this.currentItem.categoryId = '';
  }

  get teaCount(): number {
    return this.dashboardItems.filter((item) => item.type === 'Tea').length;
  }

  get teawareCount(): number {
    return this.dashboardItems.filter((item) => item.type === 'Teaware').length;
  }

  get totalSales(): number {
    return this.dashboardItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }

  saveItem(): void {
    if (!this.currentItem.name?.trim()) {
      this.toastr.warning('اكتب اسم المنتج أولاً');
      return;
    }

    if (this.currentItem.categoryId === '' || this.currentItem.categoryId == null) {
      this.toastr.warning('اختَر الفئة من القائمة');
      return;
    }

    const selected = this.activeCategories.find(
      (c) => String(c.id) === String(this.currentItem.categoryId)
    );
    const imageUrls = [...(this.currentItem.imageUrls || [])];

    this.isSaving = true;

    if (this.currentItem.type === 'Tea') {
      const payload: ProductPayload = {
        name: this.currentItem.name.trim(),
        description: this.currentItem.description?.trim() || '',
        price: Number(this.currentItem.price) || 0,
        discount: Number(this.currentItem.discount) || 0,
        brewingGuide: this.currentItem.brewingGuide?.trim() || '',
        categoryId: Number(this.currentItem.categoryId),
        categoryName: selected?.name,
        imageUrls
      };

      const request$ =
        this.modalMode === 'add'
          ? this.productsService.create(payload)
          : this.productsService.update(this.currentItem.id, payload);

      request$.subscribe({
        next: () => {
          this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة المنتج' : 'تم تحديث المنتج');
          this.closeModal();
          this.loadDashboard();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastr.error(err?.error?.message || 'فشل حفظ المنتج عبر الـ API');
        }
      });
      return;
    }

    const teawarePayload: TeawarePayload = {
      name: this.currentItem.name.trim(),
      description: this.currentItem.description?.trim() || '',
      price: Number(this.currentItem.price) || 0,
      discount: Number(this.currentItem.discount) || 0,
      teawareCategoryId: Number(this.currentItem.categoryId),
      teawareCategoryName: selected?.name,
      imageUrls
    };

    const teawareReq$ =
      this.modalMode === 'add'
        ? this.teawareService.create(teawarePayload)
        : this.teawareService.update(this.currentItem.id, teawarePayload);

    teawareReq$.subscribe({
      next: () => {
        this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة الأداة' : 'تم تحديث الأداة');
        this.closeModal();
        this.loadDashboard();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(err?.error?.message || 'فشل حفظ الأداة عبر الـ API');
      }
    });
  }

  onDelete(item: DashboardItem): void {
    if (!confirm(`هل تريد حذف "${item.name}"؟`)) return;

    const request$ =
      item.type === 'Tea'
        ? this.productsService.delete(item.id)
        : this.teawareService.delete(item.id);

    request$.subscribe({
      next: () => {
        this.toastr.success('تم الحذف بنجاح');
        this.loadDashboard();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'فشل الحذف عبر الـ API');
      }
    });
  }

  initLuxuryAnimations(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.from('.stat-card', {
      duration: 0.45,
      y: 16,
      opacity: 0,
      stagger: 0.08,
      ease: 'power2.out'
    });
  }

  private emptyForm() {
    return {
      id: '' as string | number,
      name: '',
      description: '',
      price: 0,
      discount: 0,
      brewingGuide: '',
      categoryId: '' as string | number | '',
      type: 'Tea' as 'Tea' | 'Teaware',
      imageUrls: [] as string[]
    };
  }

  private mapProducts(products: Product[]): DashboardItem[] {
    return products.map((p, index) => {
      const imageUrls = this.apiHelper.extractImageUrls(p as unknown as Record<string, unknown>);
      return {
        id: p.id ?? index,
        name: p.name,
        category: String(p.categoryName || ''),
        categoryId: p.categoryId,
        type: 'Tea' as const,
        price: Number(p.price) || 0,
        discount: Number(p.discount) || 0,
        description: p.description || '',
        brewingGuide: p.brewingGuide || '',
        imageUrls,
        thumbUrl: this.apiHelper.toThumbUrl(imageUrls[0] || null, 96)
      };
    });
  }

  private mapTeawares(items: Teaware[]): DashboardItem[] {
    return items.map((p, index) => {
      const raw = p as Teaware & Record<string, unknown>;
      const nested = (raw['teawareCategory'] || raw['category']) as
        | Record<string, unknown>
        | null
        | undefined;
      const categoryId =
        Number(raw.teawareCategoryId ?? raw.categoryId ?? nested?.['id']) || undefined;
      const category = String(
        raw.teawareCategoryName ?? raw.categoryName ?? nested?.['name'] ?? ''
      );
      const imageUrls = this.apiHelper.extractImageUrls(raw as Record<string, unknown>);
      return {
        id: p.id ?? `tw-${index}`,
        name: p.name,
        category,
        categoryId,
        type: 'Teaware' as const,
        price: Number(p.price) || 0,
        discount: Number(p.discount) || 0,
        description: p.description || '',
        imageUrls,
        thumbUrl: this.apiHelper.toThumbUrl(imageUrls[0] || null, 96)
      };
    });
  }

  getItemImage(item: DashboardItem): string | null {
    return item.thumbUrl ?? this.apiHelper.getThumbUrl(item);
  }
}
