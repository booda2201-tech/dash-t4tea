import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface ImageEntry {
  preview: string;
  file?: File;
}

@Component({
  selector: 'app-image-dropzone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-dropzone.component.html',
  styleUrls: ['./image-dropzone.component.scss']
})
export class ImageDropzoneComponent implements OnChanges {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  @Input() images: string[] = [];
  @Input() label = 'صور المنتج';
  @Input() multiple = true;
  @Input() maxFiles = 8;
  /** حجم أقصى بالميجابايت (Postman: 5 MB للمنتجات) */
  @Input() maxSizeMb = 5;

  @Output() imagesChange = new EventEmitter<string[]>();
  @Output() filesChange = new EventEmitter<File[]>();

  readonly inputId = `image-dropzone-${Math.random().toString(36).slice(2, 9)}`;

  isDragging = false;
  errorMessage = '';
  private entries: ImageEntry[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images'] && !changes['images'].firstChange) {
      const incoming = this.images || [];
      const current = this.entries.map((e) => e.preview);
      if (
        incoming.length !== current.length ||
        incoming.some((url, i) => url !== current[i])
      ) {
        this.syncFromInputs();
      }
    } else if (changes['images']?.firstChange) {
      this.syncFromInputs();
    }
  }

  /** يفتح نافذة اختيار الملفات من الجهاز */
  openFilePicker(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const input = this.fileInputRef?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

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

  removeImage(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.entries = this.entries.filter((_, i) => i !== index);
    this.emitChanges();
  }

  clearFiles(): void {
    this.entries = [];
    this.emitChanges();
  }

  private syncFromInputs(): void {
    const incoming = this.images || [];
    const prevByPreview = new Map(
      this.entries.filter((e) => e.file).map((e) => [e.preview, e.file as File])
    );
    this.entries = incoming.map((preview) => ({
      preview,
      file: prevByPreview.get(preview)
    }));
    this.emitChanges(false);
  }

  private handleFiles(fileList: FileList): void {
    this.errorMessage = '';
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));

    if (!files.length) {
      this.errorMessage = 'اختَر ملفات صور فقط (PNG, JPG, WEBP..)';
      return;
    }

    const availableSlots = this.multiple
      ? Math.max(this.maxFiles - this.entries.length, 0)
      : 1;

    if (availableSlots === 0) {
      this.errorMessage = `الحد الأقصى ${this.maxFiles} صور`;
      return;
    }

    const selected = this.multiple ? files.slice(0, availableSlots) : [files[0]];
    const maxBytes = this.maxSizeMb * 1024 * 1024;
    const oversized = selected.find((f) => f.size > maxBytes);
    if (oversized) {
      this.errorMessage = `حجم الصورة يجب أن يكون أقل من ${this.maxSizeMb}MB`;
      return;
    }

    Promise.all(selected.map((file) => this.readAsDataUrl(file))).then((urls) => {
      const nextEntries = selected.map((file, i) => ({
        preview: urls[i],
        file
      }));

      this.entries = this.multiple ? [...this.entries, ...nextEntries] : nextEntries;
      this.emitChanges();
    });
  }

  private emitChanges(emitImages = true): void {
    const previews = this.entries.map((e) => e.preview);
    const files = this.entries.filter((e) => !!e.file).map((e) => e.file as File);

    this.images = previews;
    if (emitImages) {
      this.imagesChange.emit(previews);
    }
    this.filesChange.emit(files);
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
