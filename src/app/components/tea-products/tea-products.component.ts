import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../services/products.service';
import { CategoriesService } from '../../services/categories.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { ImageDropzoneComponent } from '../shared/image-dropzone/image-dropzone.component';
import { TeaLoaderComponent } from '../shared/tea-loader/tea-loader.component';
import { Category, Product, ProductPayload } from '../../models/catalog.model';

@Component({
  selector: 'app-tea-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageDropzoneComponent, TeaLoaderComponent],
  templateUrl: './tea-products.component.html',
  styleUrls: ['./tea-products.component.scss']
})
export class TeaProductsComponent implements OnInit {
  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  editingId: string | number | null = null;
  isLoading = false;
  isSaving = false;
  isLoadingDetail = false;

  searchQuery = '';
  categories: Category[] = [];

  productModel = this.emptyForm();
  imageFiles: File[] = [];
  teaProducts: Product[] = [];
  filteredProducts: Product[] = [];

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private apiHelper: ApiResponseHelper,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  trackById(_index: number, product: Product): string | number {
    return product.id ?? product.name;
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredProducts = this.teaProducts;
      return;
    }

    this.filteredProducts = this.teaProducts.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const category = (p.categoryName || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      const brewing = (p.brewingGuide || '').toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        description.includes(q) ||
        brewing.includes(q)
      );
    });
  }

  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (res) => (this.categories = this.apiHelper.asArray<Category>(res)),
      error: () => {
        this.categories = [];
        this.toastr.warning('تعذر تحميل الفئات، أضف فئة أولاً من صفحة الفئات');
      }
    });
  }

  openModal(mode: 'add' | 'edit', product?: Product): void {
    this.modalMode = mode;
    this.isModalOpen = true;
    this.imageFiles = [];
    this.isLoadingDetail = false;

    if (mode === 'edit' && product) {
      this.editingId = product.id ?? null;
      this.fillForm(product);

      // نجيب التفاصيل كاملة عشان كل imageUrls تظهر (القائمة ممكن ترجع صورة واحدة بس)
      if (product.id != null) {
        this.isLoadingDetail = true;
        this.productsService.getById(product.id).subscribe({
          next: (res) => {
            const detail = this.unwrapProduct(res);
            this.fillForm(detail);
            this.isLoadingDetail = false;
          },
          error: () => {
            this.isLoadingDetail = false;
            this.toastr.warning('تعذر تحميل كل صور المنتج، تم عرض المتاح من القائمة');
          }
        });
      }
    } else {
      this.productModel = this.emptyForm();
      this.editingId = null;
    }
  }

  onImagesChange(urls: string[]): void {
    this.productModel.imageUrls = urls;
  }

  onImageFilesChange(files: File[]): void {
    this.imageFiles = files;
  }

  async saveProduct(): Promise<void> {
    if (!this.productModel.name?.trim()) {
      this.toastr.warning('اكتب اسم المنتج أولاً');
      return;
    }

    if (this.productModel.categoryId === '' || this.productModel.categoryId == null) {
      this.toastr.warning('اختَر الفئة');
      return;
    }

    const selected = this.categories.find(
      (c) => String(c.id) === String(this.productModel.categoryId)
    );

    const { files, existingUrls } = await this.resolveImagesForUpload();

    if (this.modalMode === 'add' && !files.length) {
      this.toastr.warning('أضف صورة واحدةً على الأقل للمنتج');
      return;
    }

    if (this.modalMode === 'edit' && files.length) {
      this.toastr.warning(
        'Endpoint التعديل بيقبل JSON فقط ومش بيرفع ملفات. الصور الجديدة مش هتتحفظ — ارفع الصور المتعددة من "إضافة صنف جديد".'
      );
    }

    const payload: ProductPayload = {
      name: this.productModel.name.trim(),
      description: this.productModel.description?.trim() || '',
      price: Number(this.productModel.price) || 0,
      discount: Number(this.productModel.discount) || 0,
      brewingGuide: this.productModel.brewingGuide?.trim() || '',
      categoryId: Number(this.productModel.categoryId),
      categoryName: selected?.name,
      imageUrls: [...existingUrls]
    };

    this.isSaving = true;
    const request$ =
      this.modalMode === 'add'
        ? this.productsService.create(payload, files)
        : this.productsService.update(this.editingId as string | number, payload, existingUrls);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة المنتج' : 'تم تحديث المنتج');
        this.closeModal();
        this.loadProducts(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(this.resolveSaveError(err));
      }
    });
  }

  private fillForm(product: Product): void {
    const imageUrls = this.apiHelper.extractImageUrls(
      product as unknown as Record<string, unknown>
    );
    this.productModel = {
      name: product.name,
      description: product.description || '',
      price: Number(product.price) || 0,
      discount: Number(product.discount) || 0,
      brewingGuide: product.brewingGuide || '',
      categoryId: product.categoryId ?? '',
      imageUrls: imageUrls.length ? imageUrls : [...(product.imageUrls || [])]
    };
  }

  private unwrapProduct(payload: unknown): Product {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      for (const key of ['data', 'result', 'value', 'product']) {
        const nested = obj[key];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          return nested as Product;
        }
      }
      return payload as Product;
    }
    return {} as Product;
  }

  private async resolveImagesForUpload(): Promise<{ files: File[]; existingUrls: string[] }> {
    const previews = [...(this.productModel.imageUrls || [])];
    const existingUrls = previews.filter(
      (url) => /^https?:\/\//i.test(url) || url.startsWith('/')
    );
    const dataUrls = previews.filter((url) => url.startsWith('data:'));

    const filesFromPicker = [...this.imageFiles];
    const converted: File[] = [];

    for (let i = 0; i < dataUrls.length; i++) {
      if (filesFromPicker[i]) {
        converted.push(filesFromPicker[i]);
        continue;
      }
      converted.push(await this.dataUrlToFile(dataUrls[i], `product-${Date.now()}-${i + 1}.jpg`));
    }

    if (filesFromPicker.length > converted.length) {
      converted.push(...filesFromPicker.slice(converted.length));
    }

    return { files: converted, existingUrls };
  }

  private async dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    return new File([blob], filename, { type });
  }

  deleteProduct(product: Product): void {
    if (product.id == null) {
      this.toastr.warning('لا يمكن حذف منتج بدون معرف من السيرفر');
      return;
    }

    if (!confirm(`هل تريد حذف صنف "${product.name}" من المخزون؟`)) return;

    this.productsService.delete(product.id).subscribe({
      next: () => {
        this.toastr.success('تم حذف المنتج');
        this.loadProducts(true);
      },
      error: (err) => {
        this.toastr.error(this.resolveSaveError(err, 'فشل حذف المنتج عبر الـ API'));
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSaving = false;
    this.isLoadingDetail = false;
    this.imageFiles = [];
  }

  loadProducts(force = false): void {
    this.isLoading = true;
    this.productsService.getAll(force).subscribe({
      next: (res) => {
        this.teaProducts = this.apiHelper.asArray<Product>(res).map((p) => {
          const imageUrls = this.apiHelper.extractImageUrls(p as unknown as Record<string, unknown>);
          return {
            ...p,
            imageUrls,
            thumbUrl: this.apiHelper.toThumbUrl(imageUrls[0] || null, 96)
          };
        });
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.teaProducts = [];
        this.filteredProducts = [];
        this.toastr.error(err?.error?.message || 'تعذر تحميل منتجات الشاي من السيرفر');
      }
    });
  }

  private resolveSaveError(
    err: { status?: number; error?: { message?: string; title?: string; detail?: string } },
    fallback?: string
  ): string {
    if (err?.status === 415) {
      return 'السيرفر رافض نوع البيانات (415). التعديل لازم JSON مش رفع ملفات.';
    }
    if (err?.status === 400) {
      return (
        err?.error?.detail ||
        err?.error?.message ||
        err?.error?.title ||
        'بيانات غير مقبولة (400). تأكد من الفئة والمنتج موجودين'
      );
    }
    if (err?.status === 404) {
      return 'المنتج غير موجود على السيرفر (404)';
    }
    if (err?.status === 504 || err?.status === 0) {
      return 'السيرفر قطع الاتصال أو بطيء. صغّر حجم الصور وحاول تاني';
    }
    return err?.error?.message || fallback || 'فشل حفظ المنتج عبر الـ API';
  }

  private emptyForm() {
    return {
      name: '',
      description: '',
      price: 0,
      discount: 0,
      brewingGuide: '',
      categoryId: '' as string | number | '',
      imageUrls: [] as string[]
    };
  }
}
