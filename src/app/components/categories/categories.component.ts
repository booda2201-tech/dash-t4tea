import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { gsap } from 'gsap';
import { forkJoin } from 'rxjs';
import { CategoriesService } from '../../services/categories.service';
import { ProductsService } from '../../services/products.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { Category, CategoryPayload, Product } from '../../models/catalog.model';
import { TeaLoaderComponent } from '../shared/tea-loader/tea-loader.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TeaLoaderComponent],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  isLoading = false;
  isSaving = false;

  catForm = { name: '', description: '' };
  editingId: string | number | null = null;

  categories: Category[] = [];
  private products: Product[] = [];

  constructor(
    private categoriesService: CategoriesService,
    private productsService: ProductsService,
    private apiHelper: ApiResponseHelper,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;

    forkJoin({
      categories: this.categoriesService.getAll(),
      products: this.productsService.getAll()
    }).subscribe({
      next: ({ categories, products }) => {
        this.products = this.apiHelper.asArray<Product>(products);
        const cats = this.apiHelper.asArray<Category>(categories);

        this.categories = cats.map((cat) => ({
          ...cat,
          count: this.resolveCount(cat)
        }));

        this.isLoading = false;
        setTimeout(() => this.animateCards(), 0);
      },
      error: () => {
        // fallback: categories only
        this.categoriesService.getAll().subscribe({
          next: (res) => {
            const cats = this.apiHelper.asArray<Category>(res);
            this.categories = cats.map((cat) => ({
              ...cat,
              count: this.resolveCount(cat)
            }));
            this.isLoading = false;
            setTimeout(() => this.animateCards(), 0);
          },
          error: (err) => {
            this.isLoading = false;
            this.categories = [];
            this.toastr.error(err?.error?.message || 'تعذر تحميل الفئات من السيرفر');
          }
        });
      }
    });
  }

  openModal(mode: 'add' | 'edit', cat?: Category): void {
    this.modalMode = mode;
    this.isModalOpen = true;

    if (mode === 'edit' && cat) {
      this.catForm = {
        name: cat.name || '',
        description: cat.description || ''
      };
      this.editingId = cat.id ?? null;
    } else {
      this.catForm = { name: '', description: '' };
      this.editingId = null;
    }
  }

  saveCategory(): void {
    if (!this.catForm.name.trim()) {
      this.toastr.warning('اكتب اسم الفئة أولاً');
      return;
    }

    const payload: CategoryPayload = {
      name: this.catForm.name.trim(),
      description: this.catForm.description.trim()
    };

    this.isSaving = true;
    const request$ =
      this.modalMode === 'add'
        ? this.categoriesService.create(payload)
        : this.categoriesService.update(this.editingId as string | number, payload);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة الفئة' : 'تم تحديث الفئة');
        this.closeModal();
        this.reloadCategories();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(this.resolveSaveError(err));
      }
    });
  }

  deleteCategory(cat: Category): void {
    if (cat.id == null) {
      this.toastr.warning('لا يمكن حذف فئة بدون معرف من السيرفر');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف فئة "${cat.name}"؟`)) return;

    this.categoriesService.delete(cat.id).subscribe({
      next: () => {
        this.toastr.success('تم حذف الفئة');
        this.reloadCategories();
      },
      error: (err) => {
        this.toastr.error(this.resolveSaveError(err, 'فشل حذف الفئة عبر الـ API'));
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSaving = false;
    this.catForm = { name: '', description: '' };
    this.editingId = null;
  }

  /** إعادة تحميل إجبارية بعد إضافة/تعديل/حذف */
  private reloadCategories(): void {
    this.isLoading = true;
    forkJoin({
      categories: this.categoriesService.getAll(true),
      products: this.productsService.getAll(true)
    }).subscribe({
      next: ({ categories, products }) => {
        this.products = this.apiHelper.asArray<Product>(products);
        const cats = this.apiHelper.asArray<Category>(categories);
        this.categories = cats.map((cat) => ({
          ...cat,
          count: this.resolveCount(cat)
        }));
        this.isLoading = false;
        setTimeout(() => this.animateCards(), 0);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error(this.resolveSaveError(err, 'تعذر تحديث قائمة الفئات'));
      }
    });
  }

  private resolveSaveError(err: { status?: number; error?: { message?: string } }, fallback?: string): string {
    if (err?.status === 403) {
      return 'غير مصرح بإضافة/تعديل الفئات بهذا الحساب';
    }
    if (err?.status === 401) {
      return 'انتهت الجلسة، سجّل الدخول مرة أخرى';
    }
    if (err?.status === 504 || err?.status === 0) {
      return 'السيرفر بطيء أو مش راد (timeout). جرّب تاني بعد ما توقّظ الـ API';
    }
    return err?.error?.message || fallback || 'فشل حفظ الفئة عبر الـ API';
  }

  private resolveCount(cat: Category): number {
    // الـ API بيرجع products: [] فاضي جوا الفئة حتى لو فيه منتجات حقيقية
    // فنحسب العدد من قائمة المنتجات المحمّلة أولاً
    if (this.products.length > 0) {
      return this.products.filter((p) => {
        const byId =
          cat.id != null &&
          p.categoryId != null &&
          String(p.categoryId) === String(cat.id);
        const byName =
          !!cat.name &&
          (p.categoryName === cat.name);
        return byId || byName;
      }).length;
    }

    if (Array.isArray(cat.products) && cat.products.length > 0) {
      return cat.products.length;
    }

    return typeof cat.count === 'number' ? cat.count : 0;
  }

  private animateCards(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.from('.category-item', {
      duration: 0.4,
      opacity: 0,
      y: 12,
      stagger: 0.05,
      ease: 'power2.out'
    });
  }
}
