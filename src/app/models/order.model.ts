/** حالات الطلب الشائعة من الـ API */
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | string;

export interface OrderItem {
  id?: number;
  productId?: number;
  teawareId?: number;
  name?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  total?: number;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface Order {
  id?: number;
  orderNumber?: string;
  status?: OrderStatus;
  total?: number;
  totalAmount?: number;
  subtotal?: number;
  shippingCost?: number;
  createdAt?: string;
  orderDate?: string;
  updatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  phone?: string;
  email?: string;
  recipientName?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingGovernorate?: string;
  shippingPostalCode?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  address?: string;
  city?: string;
  notes?: string;
  paymentMethod?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  [key: string]: unknown;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}
