// Product Service Types

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  availability?: boolean;
}

export interface Company {
  id: number;
  name: string;
  type: string;
  address?: string;
  contactEmail?: string;
  logoUrl?: string;
  availability?: boolean;
}

export interface Product {
  id: number;
  companyId: number;
  company?: Company;
  name: string;
  description: string;
  netPrice: number;
  price: number;
  sku: string;
  stock: number;
  isActive: boolean;
  availability?: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  images: ProductImage[];
}

export interface ProductImage {
  id: number;
  url: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
}

export interface CreateProductDto {
  companyId: number;
  categoryId: number;
  name: string;
  description?: string;
  netPrice: number;
  sku: string;
  stock: number;
  imageUrls?: string[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  netPrice?: number;
  sku?: string;
  stock?: number;
  images?: string[];
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartDto {
  productId: number;
  quantity: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  issuedAt: string;
  details: string;
}

export interface Order {
  id: number;
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  receipt: Receipt;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Ожидает обработки',
  CONFIRMED: 'Подтвержден',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменен',
  REFUNDED: 'Возвращен',
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, string> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'primary',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'secondary',
};
