import api from './api';
import type {
  Product,
  Category,
  Cart,
  Order,
  Page,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AddToCartDto,
  OrderStatus,
} from './types';

const PRODUCT_SERVICE = '/product-service';

// ============ Products ============

export async function getProducts(params?: {
  ids?: number[];
  companyId?: number;
  categoryId?: number;
  name?: string;
  availability?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
}): Promise<Page<Product>> {
  const { data } = await api.get<Page<Product>>(`${PRODUCT_SERVICE}/products`, { params });
  return data;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get<Product>(`${PRODUCT_SERVICE}/products/${id}`);
  return data;
}

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const { data } = await api.post<Product>(`${PRODUCT_SERVICE}/products`, dto);
  return data;
}

export async function updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
  const { data } = await api.put<Product>(`${PRODUCT_SERVICE}/products/${id}`, dto);
  return data;
}

export async function changeProductStatus(id: number, status: boolean): Promise<void> {
  await api.patch(`${PRODUCT_SERVICE}/products/${id}`, null, { params: { status } });
}

// ============ Categories ============

export async function getCategories(params?: {
  ids?: number[];
  name?: string;
  availability?: boolean;
  page?: number;
  size?: number;
}): Promise<Page<Category>> {
  const { data } = await api.get<Page<Category>>(`${PRODUCT_SERVICE}/categories`, { params });
  return data;
}

export async function getCategory(id: number): Promise<Category> {
  const { data } = await api.get<Category>(`${PRODUCT_SERVICE}/categories/${id}`);
  return data;
}

export async function createCategory(dto: CreateCategoryDto): Promise<Category> {
  const { data } = await api.post<Category>(`${PRODUCT_SERVICE}/categories`, dto);
  return data;
}

export async function updateCategory(id: number, dto: UpdateCategoryDto): Promise<Category> {
  const { data } = await api.put<Category>(`${PRODUCT_SERVICE}/categories/${id}`, dto);
  return data;
}

export async function changeCategoryStatus(id: number, status: boolean): Promise<void> {
  await api.patch(`${PRODUCT_SERVICE}/categories/${id}`, null, { params: { status } });
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`${PRODUCT_SERVICE}/categories/${id}`);
}

// ============ Cart ============

export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Cart>(`${PRODUCT_SERVICE}/cart`);
  return data;
}

export async function addToCart(dto: AddToCartDto): Promise<Cart> {
  const { data } = await api.post<Cart>(`${PRODUCT_SERVICE}/cart/items`, dto);
  return data;
}

export async function updateCartItemQuantity(
  productId: number,
  quantity: number
): Promise<Cart> {
  const { data } = await api.put<Cart>(`${PRODUCT_SERVICE}/cart/items/${productId}`, null, {
    params: { quantity }
  });
  return data;
}

export async function removeFromCart(productId: number): Promise<void> {
  await api.delete(`${PRODUCT_SERVICE}/cart/items/${productId}`);
}

export async function clearCart(): Promise<void> {
  await api.delete(`${PRODUCT_SERVICE}/cart`);
}

// ============ Orders ============

export async function createOrder(): Promise<Order> {
  const { data } = await api.post<Order>(`${PRODUCT_SERVICE}/orders/create`);
  return data;
}

export async function getOrder(orderId: number): Promise<Order> {
  const { data } = await api.get<Order>(`${PRODUCT_SERVICE}/orders/${orderId}`);
  return data;
}

export async function getUserOrders(params?: {
  status?: OrderStatus;
  page?: number;
  size?: number;
}): Promise<Page<Order>> {
  const { data } = await api.get<Page<Order>>(`${PRODUCT_SERVICE}/orders/user`, {
    params
  });
  return data;
}

export async function getAllOrders(params?: {
  status?: OrderStatus;
  page?: number;
  size?: number;
}): Promise<Page<Order>> {
  const { data } = await api.get<Page<Order>>(`${PRODUCT_SERVICE}/orders`, { params });
  return data;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  const { data } = await api.patch<Order>(`${PRODUCT_SERVICE}/orders/${orderId}/status`, {
    status
  });
  return data;
}

export async function getOrderReceipt(orderId: number) {
  const { data } = await api.get(`${PRODUCT_SERVICE}/orders/${orderId}/receipt`);
  return data;
}

export async function getReceiptByNumber(receiptNumber: string) {
  const { data } = await api.get(`${PRODUCT_SERVICE}/orders/receipt/${receiptNumber}`);
  return data;
}

// Default export as object
export const productService = {
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  changeProductStatus,
  // Categories
  getAllCategories: getCategories,
  getCategory,
  createCategory,
  updateCategory,
  changeCategoryStatus,
  deleteCategory,
  // Cart
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  // Orders
  createOrder,
  getOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderReceipt,
  getReceiptByNumber,
  // API
  api,
};
