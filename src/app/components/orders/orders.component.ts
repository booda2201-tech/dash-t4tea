import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { OrdersService } from '../../services/orders.service';
import { ApiResponseHelper } from '../../services/api-response.helper';
import { AuthService } from '../../services/auth.service';
import { Order, OrderItem, OrderStatus } from '../../models/order.model';
import { TeaLoaderComponent } from '../shared/tea-loader/tea-loader.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, TeaLoaderComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  isLoading = false;
  isDetailLoading = false;
  isUpdating = false;
  isDetailOpen = false;

  searchQuery = '';
  statusFilter: OrderStatus | '' = '';
  isStatusMenuOpen = false;

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  selectedStatus: OrderStatus = 'Pending';

  authForbidden = false;
  authDebug: {
    hasToken: boolean;
    roles: string[];
    isAdmin: boolean;
    userRole: string | undefined;
    claimsPreview: string;
  } = {
    hasToken: false,
    roles: [],
    isAdmin: false,
    userRole: undefined,
    claimsPreview: ''
  };

  readonly statusOptions: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    { value: 'Pending', label: 'قيد الانتظار' },
    { value: 'Confirmed', label: 'مؤكد' },
    { value: 'Processing', label: 'قيد التجهيز' },
    { value: 'Shipped', label: 'تم الشحن' },
    { value: 'Delivered', label: 'تم التسليم' },
    { value: 'Cancelled', label: 'ملغي' }
  ];

  get pendingOrdersCount(): number {
    return this.orders.filter((order) => {
      const status = this.getStatus(order).toLowerCase();
      return status.includes('pending') || status.includes('confirm');
    }).length;
  }

  get activeOrdersCount(): number {
    return this.orders.filter((order) => {
      const status = this.getStatus(order).toLowerCase();
      return status.includes('process') || status.includes('ship');
    }).length;
  }

  get totalOrdersValue(): number {
    return this.orders.reduce((total, order) => total + this.getTotal(order), 0);
  }

  get selectedStatusLabel(): string {
    return this.statusOptions.find((option) => option.value === this.statusFilter)?.label || 'كل الحالات';
  }

  get updateStatusOptions(): { value: OrderStatus | ''; label: string }[] {
    const current = this.getStatus(this.selectedOrder);
    const transitions: Record<string, OrderStatus[]> = {
      Pending: ['Pending', 'Confirmed', 'Cancelled'],
      Confirmed: ['Confirmed', 'Processing', 'Cancelled'],
      Processing: ['Processing', 'Shipped', 'Cancelled'],
      Shipped: ['Shipped', 'Delivered'],
      Delivered: ['Delivered'],
      Cancelled: ['Cancelled']
    };
    const allowed = transitions[String(current)];
    if (!allowed) return this.statusOptions.filter((option) => option.value !== '');
    return this.statusOptions.filter(
      (option) => option.value !== '' && allowed.includes(option.value)
    );
  }

  get canSaveStatus(): boolean {
    return Boolean(
      this.selectedOrder &&
      this.selectedStatus &&
      this.selectedStatus !== this.getStatus(this.selectedOrder)
    );
  }

  constructor(
    private ordersService: OrdersService,
    private apiHelper: ApiResponseHelper,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(force = false): void {
    this.isLoading = true;
    this.authForbidden = false;
    this.authDebug = this.auth.getAuthDebugInfo();

    const request$ = force
      ? this.ordersService.refresh(this.statusFilter)
      : this.ordersService.getAll(this.statusFilter);

    request$.subscribe({
      next: (res) => {
        this.orders = this.apiHelper.asArray<Order>(res).map((o) => this.normalizeOrder(o));
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.orders = [];
        this.filteredOrders = [];
        this.authForbidden = err?.status === 403;
        this.authDebug = this.auth.getAuthDebugInfo();
        this.toastr.error(this.resolveLoadError(err));
      }
    });
  }

  reLogin(): void {
    this.auth.logoutAndRedirect();
  }

  goToSectionChoice(): void {
    this.router.navigate(['/choose-section']);
  }

  logout(): void {
    this.auth.logoutAndRedirect();
  }

  copyDebugInfo(): void {
    const text = [
      `hasToken=${this.authDebug.hasToken}`,
      `roles=${this.authDebug.roles.join(',') || '(none)'}`,
      `userRole=${this.authDebug.userRole || '(none)'}`,
      `claims=${this.authDebug.claimsPreview}`
    ].join('\n');

    navigator.clipboard?.writeText(text).then(
      () => this.toastr.success('تم نسخ بيانات التشخيص'),
      () => this.toastr.info(text)
    );
  }

  onStatusFilterChange(value: OrderStatus | ''): void {
    this.statusFilter = value;
    this.loadOrders(true);
  }

  toggleStatusMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isStatusMenuOpen = !this.isStatusMenuOpen;
  }

  selectStatus(value: OrderStatus | '', event: MouseEvent): void {
    event.stopPropagation();
    this.isStatusMenuOpen = false;
    if (this.statusFilter === value) return;
    this.onStatusFilterChange(value);
  }

  @HostListener('document:click')
  closeStatusMenu(): void {
    this.isStatusMenuOpen = false;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  trackById(_index: number, order: Order): string | number {
    return order.id ?? order.orderNumber ?? _index;
  }

  openDetail(order: Order): void {
    if (order.id == null) {
      this.toastr.warning('لا يمكن عرض طلب بدون معرف');
      return;
    }

    this.isDetailOpen = true;
    this.isDetailLoading = true;
    this.selectedOrder = order;
    this.selectedStatus = this.getStatus(order);

    this.ordersService.getById(order.id).subscribe({
      next: (res) => {
        const detail = this.unwrapOrder(res);
        // بعض ردود تفاصيل الطلب لا تعيد بيانات العميل الموجودة في رد القائمة.
        // ندمج الردين بدل استبدال طلب القائمة بالكامل.
        this.selectedOrder = this.normalizeOrder(this.mergeOrderData(order, detail));
        this.selectedStatus = this.getStatus(this.selectedOrder);
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.isDetailLoading = false;
        this.toastr.error(this.resolveLoadError(err, 'تعذر تحميل تفاصيل الطلب'));
      }
    });
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedOrder = null;
    this.isUpdating = false;
    this.isDetailLoading = false;
  }

  saveStatus(): void {
    if (!this.selectedOrder?.id) {
      this.toastr.warning('لا يمكن تحديث طلب بدون معرف');
      return;
    }

    if (!this.selectedStatus) {
      this.toastr.warning('اختر حالة الطلب');
      return;
    }

    if (!this.canSaveStatus) {
      this.toastr.info('اختر حالة جديدة للطلب');
      return;
    }

    this.isUpdating = true;
    this.ordersService.updateStatus(this.selectedOrder.id, this.selectedStatus).subscribe({
      next: () => {
        const updatedId = this.selectedOrder?.id;
        this.orders = this.orders.map((order) =>
          order.id === updatedId ? { ...order, status: this.selectedStatus } : order
        );
        this.applyFilter();
        this.toastr.success('تم تحديث حالة الطلب');
        this.isUpdating = false;
        this.closeDetail();
        this.loadOrders(true);
      },
      error: (err) => {
        this.isUpdating = false;
        this.toastr.error(this.resolveLoadError(err, 'فشل تحديث حالة الطلب'));
      }
    });
  }

  getStatus(order: Order | null | undefined): OrderStatus {
    if (!order) return 'Pending';
    const raw =
      order.status ??
      (order['Status'] as string | undefined) ??
      (order['orderStatus'] as string | undefined) ??
      'Pending';
    return String(raw);
  }

  getStatusLabel(status: OrderStatus | undefined): string {
    const found = this.statusOptions.find((s) => s.value === status);
    return found?.label || status || '—';
  }

  getStatusClass(status: OrderStatus | undefined): string {
    const key = String(status || '').toLowerCase();
    if (key.includes('cancel')) return 'status-cancelled';
    if (key.includes('deliver')) return 'status-delivered';
    if (key.includes('ship')) return 'status-shipped';
    if (key.includes('process') || key.includes('confirm')) return 'status-processing';
    return 'status-pending';
  }

  getTotal(order: Order | null | undefined): number {
    if (!order) return 0;
    const items = this.getItems(order);
    if (items.length) {
      const itemsTotal = items.reduce(
        (total, item) => total + this.getItemPrice(item) * this.getItemQty(item),
        0
      );
      if (itemsTotal > 0) return itemsTotal;
    }
    return Number(order.totalAmount ?? order.total ?? order['TotalAmount'] ?? order['Total'] ?? 0);
  }

  getCustomerName(order: Order | null | undefined): string {
    if (!order) return '—';
    const customer = this.getNestedRecord(order, ['user', 'User', 'customer', 'Customer']);
    const firstName = this.firstText(customer?.['firstName'], customer?.['FirstName']);
    const lastName = this.firstText(customer?.['lastName'], customer?.['LastName']);
    const nestedFullName = [firstName, lastName].filter(Boolean).join(' ');

    return this.firstText(
      order['recipientName'],
      order['RecipientName'],
      customer?.['fullName'],
      customer?.['FullName'],
      nestedFullName,
      customer?.['name'],
      customer?.['Name'],
      order['fullName'],
      order['FullName'],
      order['customerFullName'],
      order['CustomerFullName'],
      this.findNestedText(order, [
        'recipientName',
        'customerFullName',
        'fullName',
        'displayName'
      ]),
      order.customerName,
      order['CustomerName'],
      order['userName'],
      order['UserName'],
      customer?.['userName'],
      customer?.['UserName']
    ) || '—';
  }

  getCustomerInitial(order: Order | null | undefined): string {
    const name = this.getCustomerName(order).trim();
    return name && name !== '—' ? name.charAt(0).toUpperCase() : 'T';
  }

  getCustomerPhone(order: Order | null | undefined): string {
    if (!order) return '—';
    const customer = this.getNestedRecord(order, ['customer', 'Customer', 'user', 'User']);
    const shipping = this.getNestedRecord(order, [
      'shippingDetails',
      'ShippingDetails',
      'shippingInfo',
      'ShippingInfo'
    ]);

    return this.firstText(
      order['shippingPhone'],
      order['ShippingPhone'],
      order.customerPhone,
      order.phone,
      order['CustomerPhone'],
      order['Phone'],
      order['phoneNumber'],
      order['PhoneNumber'],
      customer?.['phone'],
      customer?.['Phone'],
      customer?.['phoneNumber'],
      customer?.['PhoneNumber'],
      customer?.['mobile'],
      shipping?.['phone'],
      shipping?.['phoneNumber'],
      this.findNestedText(order, [
        'shippingPhone',
        'customerPhone',
        'customerPhoneNumber',
        'phone',
        'phoneNumber',
        'mobile',
        'mobileNumber',
        'contactPhone',
        'recipientPhone',
        'telephone'
      ])
    ) || '—';
  }

  getAddressParts(order: Order | null | undefined): { label: string; value: string }[] {
    if (!order) return [];

    const shipping = this.getNestedRecord(order, [
      'shippingAddress',
      'ShippingAddress',
      'address',
      'Address',
      'shippingDetails',
      'ShippingDetails'
    ]);

    const governorate = this.firstText(
      order['shippingGovernorate'],
      order['ShippingGovernorate'],
      shipping?.['shippingGovernorate'],
      shipping?.['governorate']
    );
    const city = this.firstText(
      order['shippingCity'],
      order['ShippingCity'],
      shipping?.['shippingCity'],
      shipping?.['city']
    );
    const street = this.firstText(
      order['shippingStreet'],
      order['ShippingStreet'],
      shipping?.['shippingStreet'],
      shipping?.['street'],
      shipping?.['addressLine']
    );
    const postalCode = this.firstText(
      order['shippingPostalCode'],
      order['ShippingPostalCode'],
      shipping?.['shippingPostalCode'],
      shipping?.['postalCode']
    );

    const parts = [
      { label: 'المحافظة', value: governorate },
      { label: 'المدينة', value: city },
      { label: 'الشارع / العقار', value: street },
      { label: 'الرمز البريدي', value: postalCode }
    ].filter((part) => part.value);

    if (parts.length) return parts;

    const fallback = this.firstText(
      typeof order.shippingAddress === 'string' ? order.shippingAddress : undefined,
      typeof order.address === 'string' ? order.address : undefined
    );

    return fallback ? [{ label: 'العنوان', value: fallback }] : [];
  }

  getAddress(order: Order | null | undefined): string {
    const parts = this.getAddressParts(order);
    if (!parts.length) return '—';
    return parts.map((part) => part.value).join('، ');
  }

  hasAddress(order: Order | null | undefined): boolean {
    return this.getAddressParts(order).length > 0;
  }

  getDate(order: Order | null | undefined): string {
    if (!order) return '—';
    const raw =
      order.createdAt ||
      order.orderDate ||
      (order['CreatedAt'] as string) ||
      (order['OrderDate'] as string);
    if (!raw) return '—';
    const rawText = String(raw);
    const isIsoWithoutTimezone =
      /^\d{4}-\d{2}-\d{2}T/.test(rawText) &&
      !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawText);
    const date = new Date(isIsoWithoutTimezone ? `${rawText}Z` : rawText);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  getItems(order: Order | null | undefined): OrderItem[] {
    if (!order) return [];
    const items =
      order.items ||
      order.orderItems ||
      (order['Items'] as OrderItem[]) ||
      (order['OrderItems'] as OrderItem[]);
    return Array.isArray(items) ? items : [];
  }

  getItemName(item: OrderItem): string {
    return item.name || item.productName || (item['Name'] as string) || 'صنف';
  }

  getItemQty(item: OrderItem): number {
    return Number(item.quantity ?? item['Quantity'] ?? 1);
  }

  getItemPrice(item: OrderItem): number {
    return Number(item.unitPrice ?? item.price ?? item['UnitPrice'] ?? item['Price'] ?? 0);
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredOrders = this.orders;
      return;
    }

    this.filteredOrders = this.orders.filter((o) => {
      const id = String(o.id ?? '');
      const number = String(o.orderNumber ?? '').toLowerCase();
      const name = this.getCustomerName(o).toLowerCase();
      const phone = this.getCustomerPhone(o).toLowerCase();
      const status = this.getStatusLabel(this.getStatus(o)).toLowerCase();
      return (
        id.includes(q) ||
        number.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        status.includes(q)
      );
    });
  }

  private normalizeOrder(order: Order): Order {
    return {
      ...order,
      id: (order.id ?? order['Id']) as number | undefined,
      status: this.getStatus(order),
      total: this.getTotal(order),
      items: this.getItems(order)
    };
  }

  private mergeOrderData(summary: Order, detail: Order): Order {
    const merged: Record<string, unknown> = { ...summary };
    Object.entries(detail).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    });
    return merged as Order;
  }

  private getNestedRecord(
    source: Order,
    keys: string[]
  ): Record<string, unknown> | undefined {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }
    return undefined;
  }

  private firstText(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return '';
  }

  private findNestedText(
    source: unknown,
    targetKeys: string[],
    depth = 0
  ): string {
    if (!source || typeof source !== 'object' || depth > 5) return '';

    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = new Set(targetKeys.map(normalizeKey));
    const record = source as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (wanted.has(normalizeKey(key))) {
        const text = this.firstText(value);
        if (text) return text;
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const text = this.findNestedText(value, targetKeys, depth + 1);
        if (text) return text;
      }
    }

    return '';
  }

  private resolveLoadError(err: { status?: number; error?: unknown }, fallback?: string): string {
    const apiMessage = this.getApiErrorMessage(err?.error);
    if (err?.status === 403) {
      const roles = this.auth.getTokenRoles();
      const roleText = roles.length ? roles.join(', ') : 'غير موجودة في التوكن';
      return `مرفوض من السيرفر (403). الأدوار في التوكن: ${roleText}. سجّل خروج ثم دخول من جديد بنفس حساب الأدمن المستخدم في Postman`;
    }
    if (err?.status === 401) {
      return 'انتهت الجلسة، سجّل الدخول مرة أخرى';
    }
    if (err?.status === 504 || err?.status === 0) {
      return 'السيرفر بطيء أو مش متاح حالياً، حاول تاني بعد شوية';
    }
    return apiMessage || fallback || 'تعذر تحميل الطلبات من السيرفر';
  }

  private getApiErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.trim()) return error.trim();
    if (!error || typeof error !== 'object') return '';

    const obj = error as Record<string, unknown>;
    const direct = this.firstText(obj['message'], obj['Message'], obj['title'], obj['Title']);
    if (direct) return direct;

    const validation = obj['errors'];
    if (validation && typeof validation === 'object') {
      for (const value of Object.values(validation as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          const message = this.firstText(...value);
          if (message) return message;
        }
        const message = this.firstText(value);
        if (message) return message;
      }
    }
    return '';
  }

  private unwrapOrder(payload: unknown): Order {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      for (const key of ['data', 'result', 'value', 'order']) {
        const nested = obj[key];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          return nested as Order;
        }
      }
      return payload as Order;
    }
    return {} as Order;
  }
}
