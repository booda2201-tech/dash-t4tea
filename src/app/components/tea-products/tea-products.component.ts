import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../services/products.service';
import { CategoriesService } from '../../services/categories.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { ImageDropzoneComponent } from '../shared/image-dropzone/image-dropzone.component';
import { Category, Product, ProductPayload } from '../../models/catalog.model';

@Component({
  selector: 'app-tea-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageDropzoneComponent],
  templateUrl: './tea-products.component.html',
  styleUrls: ['./tea-products.component.scss']
})
export class TeaProductsComponent implements OnInit {
  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  editingId: string | number | null = null;
  isLoading = false;
  isSaving = false;

  searchQuery = '';
  categories: Category[] = [];

  productModel = this.emptyForm();
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

  loadProducts(): void {
    this.isLoading = true;
    this.productsService.getAll().subscribe({
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

  openModal(mode: 'add' | 'edit', product?: Product): void {
    this.modalMode = mode;
    this.isModalOpen = true;
    if (mode === 'edit' && product) {
      this.productModel = {
        name: product.name,
        description: product.description || '',
        price: Number(product.price) || 0,
        discount: Number(product.discount) || 0,
        brewingGuide: product.brewingGuide || '',
        categoryId: product.categoryId ?? '',
        imageUrls: [...(product.imageUrls || [])]
      };
      this.editingId = product.id ?? null;
    } else {
      this.productModel = this.emptyForm();
      this.editingId = null;
    }
  }

  saveProduct(): void {
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
    const imageUrls = [...(this.productModel.imageUrls || [])];

    const payload: ProductPayload = {
      name: this.productModel.name.trim(),
      description: this.productModel.description?.trim() || '',
      price: Number(this.productModel.price) || 0,
      discount: Number(this.productModel.discount) || 0,
      brewingGuide: this.productModel.brewingGuide?.trim() || '',
      categoryId: Number(this.productModel.categoryId),
      categoryName: selected?.name,
      imageUrls
    };

    this.isSaving = true;
    const request$ =
      this.modalMode === 'add'
        ? this.productsService.create(payload)
        : this.productsService.update(this.editingId as string | number, payload);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة المنتج' : 'تم تحديث المنتج');
        this.closeModal();
        this.loadProducts();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(err?.error?.message || 'فشل حفظ المنتج عبر الـ API');
      }
    });
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
        this.loadProducts();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'فشل حذف المنتج عبر الـ API');
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSaving = false;
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
