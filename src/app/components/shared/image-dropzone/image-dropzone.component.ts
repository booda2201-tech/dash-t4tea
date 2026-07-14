import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-dropzone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-dropzone.component.html',
  styleUrls: ['./image-dropzone.component.scss']
})
export class ImageDropzoneComponent {
  @Input() images: string[] = [];
  @Input() label = 'صور المنتج';
  @Input() multiple = true;
  @Input() maxFiles = 8;
  @Output() imagesChange = new EventEmitter<string[]>();

  isDragging = false;
  errorMessage = '';

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFiles(files);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
      input.value = '';
    }
  }

  removeImage(index: number): void {
    const next = [...this.images];
    next.splice(index, 1);
    this.images = next;
    this.imagesChange.emit(next);
  }

  private handleFiles(fileList: FileList): void {
    this.errorMessage = '';
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));

    if (!files.length) {
      this.errorMessage = 'اختَر ملفات صور فقط (PNG, JPG, WEBP..)';
      return;
    }

    const availableSlots = this.multiple
      ? Math.max(this.maxFiles - this.images.length, 0)
      : 1;

    if (availableSlots === 0) {
      this.errorMessage = `الحد الأقصى ${this.maxFiles} صور`;
      return;
    }

    const selected = this.multiple ? files.slice(0, availableSlots) : [files[0]];
    const oversized = selected.find((f) => f.size > 3 * 1024 * 1024);
    if (oversized) {
      this.errorMessage = 'حجم الصورة يجب أن يكون أقل من 3MB';
      return;
    }

    Promise.all(selected.map((file) => this.readAsDataUrl(file))).then((urls) => {
      const next = this.multiple ? [...this.images, ...urls] : urls;
      this.images = next;
      this.imagesChange.emit(next);
    });
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
