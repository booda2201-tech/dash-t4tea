import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TeawareService } from '../../services/teaware.service';
import { TeawareCategoriesService } from '../../services/teaware-categories.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { ImageDropzoneComponent } from '../shared/image-dropzone/image-dropzone.component';
import { TeaLoaderComponent } from '../shared/tea-loader/tea-loader.component';
import { Teaware, TeawareCategory, TeawarePayload } from '../../models/catalog.model';

@Component({
  selector: 'app-teaware',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageDropzoneComponent, TeaLoaderComponent],
  templateUrl: './teaware.component.html',
  styleUrls: ['./teaware.component.scss']
})
export class TeawareComponent implements OnInit {
  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  editingId: string | number | null = null;
  isLoading = false;
  isSaving = false;

  searchQuery = '';
  categories: TeawareCategory[] = [];
  itemModel = this.emptyForm();
  teawareItems: Teaware[] = [];
  filteredItems: Teaware[] = [];

  constructor(
    private teawareService: TeawareService,
    private teawareCategoriesService: TeawareCategoriesService,
    private apiHelper: ApiResponseHelper,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadTeaware();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  trackById(_index: number, item: Teaware): string | number {
    return item.id ?? item.name;
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredItems = this.teawareItems;
      return;
    }

    this.filteredItems = this.teawareItems.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const category = (item.categoryName || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      return name.includes(q) || category.includes(q) || description.includes(q);
    });
  }

  loadCategories(): void {
    this.teawareCategoriesService.getAll().subscribe({
      next: (res) => (this.categories = this.apiHelper.asArray<TeawareCategory>(res)),
      error: () => (this.categories = [])
    });
  }

  loadTeaware(): void {
    this.isLoading = true;
    this.teawareService.getAll().subscribe({
      next: (res) => {
        this.teawareItems = this.apiHelper
          .asArray<Record<string, unknown>>(res)
          .map((raw) => this.normalizeItem(raw));
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.teawareItems = [];
        this.filteredItems = [];
        this.toastr.error(err?.error?.message || 'تعذر تحميل أدوات الشاي من السيرفر');
      }
    });
  }

  private normalizeItem(raw: Record<string, unknown>): Teaware {
    const nested = (raw['teawareCategory'] || raw['category']) as
      | Record<string, unknown>
      | null
      | undefined;

    const categoryId =
      Number(raw['teawareCategoryId'] ?? raw['categoryId'] ?? nested?.['id']) || undefined;
    const categoryName =
      String(
        raw['teawareCategoryName'] ??
          raw['categoryName'] ??
          nested?.['name'] ??
          ''
      ) || '';

    const imageUrls = this.apiHelper.extractImageUrls(raw);

    return {
      id: Number(raw['id']) || undefined,
      name: String(raw['name'] || ''),
      description: (raw['description'] as string) || '',
      price: Number(raw['price']) || 0,
      discount: Number(raw['discount']) || 0,
      categoryId,
      categoryName,
      teawareCategoryId: categoryId,
      teawareCategoryName: categoryName,
      imageUrls,
      thumbUrl: this.apiHelper.toThumbUrl(imageUrls[0] || null, 96)
    };
  }

  openModal(mode: 'add' | 'edit', item?: Teaware): void {
    this.modalMode = mode;
    this.isModalOpen = true;
    if (mode === 'edit' && item) {
      this.itemModel = {
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        categoryId: item.categoryId ?? item.teawareCategoryId ?? '',
        imageUrls: [...(item.imageUrls || [])]
      };
      this.editingId = item.id ?? null;
    } else {
      this.itemModel = this.emptyForm();
      this.editingId = null;
    }
  }

  saveItem(): void {
    if (!this.itemModel.name?.trim()) {
      this.toastr.warning('اكتب اسم الأداة أولاً');
      return;
    }

    if (this.itemModel.categoryId === '' || this.itemModel.categoryId == null) {
      this.toastr.warning('اختَر التصنيف');
      return;
    }

    const selected = this.categories.find(
      (c) => String(c.id) === String(this.itemModel.categoryId)
    );
    const imageUrls = [...(this.itemModel.imageUrls || [])];

    const payload: TeawarePayload = {
      name: this.itemModel.name.trim(),
      description: this.itemModel.description?.trim() || '',
      price: Number(this.itemModel.price) || 0,
      discount: Number(this.itemModel.discount) || 0,
      teawareCategoryId: Number(this.itemModel.categoryId),
      teawareCategoryName: selected?.name,
      imageUrls
    };

    this.isSaving = true;
    const request$ =
      this.modalMode === 'add'
        ? this.teawareService.create(payload)
        : this.teawareService.update(this.editingId as string | number, payload);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.modalMode === 'add' ? 'تمت إضافة الأداة' : 'تم تحديث الأداة');
        this.closeModal();
        this.loadTeaware();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(err?.error?.message || 'فشل حفظ الأداة عبر الـ API');
      }
    });
  }

  deleteItem(item: Teaware): void {
    if (item.id == null) {
      this.toastr.warning('لا يمكن حذف أداة بدون معرف من السيرفر');
      return;
    }

    if (!confirm(`هل تريد حذف "${item.name}" من قائمة الأدوات؟`)) return;

    this.teawareService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('تم حذف الأداة');
        this.loadTeaware();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'فشل حذف الأداة عبر الـ API');
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
      categoryId: '' as string | number | '',
      imageUrls: [] as string[]
    };
  }
}
