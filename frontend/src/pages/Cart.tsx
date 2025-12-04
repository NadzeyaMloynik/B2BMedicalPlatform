import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Form, Modal } from 'react-bootstrap';
import { productService } from '@/lib/productService';
import { formatCurrency } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import type { Cart as CartType } from '@/lib/types';

export default function Cart() {
  const navigate = useNavigate();
  const { accessToken, isBuyer, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartType | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('invoice');

  useEffect(() => {
    if (isAuthenticated && !isBuyer) {
      navigate('/');
      return;
    }
    if (accessToken) {
      loadCart();
    }
  }, [accessToken, isBuyer, isAuthenticated]);

  async function loadCart() {
    if (!accessToken) return;

    try {
      setLoading(true);
      const data = await productService.getCart();
      setCart(data);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateQuantity(productId: number, quantity: number) {
    if (!accessToken || !cart) return;

    try {
      const updatedCart = await productService.updateCartItemQuantity(productId, quantity);
      setCart(updatedCart);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  }

  async function handleRemoveItem(productId: number) {
    if (!accessToken || !cart || !confirm('Удалить товар из корзины?')) return;

    try {
      await productService.removeFromCart(productId);
      await loadCart();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }

  async function handleClearCart() {
    if (!accessToken || !cart || !confirm('Очистить всю корзину?')) return;

    try {
      await productService.clearCart();
      await loadCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }

  function handleOpenPaymentModal() {
    if (!cart || cart.items.length === 0) return;
    setShowPaymentModal(true);
  }

  async function handleCheckout() {
    if (!accessToken || !cart || cart.items.length === 0) return;

    try {
      setProcessing(true);
      const order = await productService.createOrder();
      setShowPaymentModal(false);
      alert(`Заказ успешно оформлен!\nСпособ оплаты: ${getPaymentMethodName(paymentMethod)}`);
      navigate(`/orders/${order.id}`);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Не удалось оформить заказ');
    } finally {
      setProcessing(false);
    }
  }

  function getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      invoice: 'Выставление счета',
      bank_transfer: 'Банковский перевод',
      purchase_order: 'Договор поставки',
      credit_line: 'Кредитная линия',
      deferred_payment: 'Отсроченный платеж (30 дней)',
      letter_of_credit: 'Аккредитив'
    };
    return methods[method] || method;
  }

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-cart3 me-2"></i>
          Корзина
        </h1>
      </div>

      {!cart || cart.items.length === 0 ? (
        <Card className="content-card text-center py-5">
          <Card.Body>
            <i className="bi bi-cart-x display-1 text-muted"></i>
            <h4 className="mt-3">Корзина пуста</h4>
            <p className="text-muted">Добавьте товары из каталога</p>
            <Button variant="brand" onClick={() => navigate('/products')}>
              Перейти к каталогу
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="content-card mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Товары в корзине ({cart.items.length})</h5>
                <Button variant="outline-danger" size="sm" onClick={handleClearCart}>
                  <i className="bi bi-trash me-1"></i>
                  Очистить корзину
                </Button>
              </div>

              <div className="table-responsive">
                <Table hover>
                  <thead className="bg-brand-tablehead">
                    <tr>
                      <th>Товар</th>
                      <th>Цена</th>
                      <th style={{ width: '150px' }}>Количество</th>
                      <th>Сумма</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {item.product.images.length > 0 && (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                className="me-2 rounded"
                              />
                            )}
                            <div>
                              <div className="fw-bold">{item.product.name}</div>
                              <small className="text-muted">{item.product.category.name}</small>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">{formatCurrency(item.product.price)}</td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <i className="bi bi-dash"></i>
                            </Button>
                            <Form.Control
                              type="number"
                              min="1"
                              max={item.product.stock}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(item.product.id, Math.max(1, Number(e.target.value)))
                              }
                              style={{ width: '60px', textAlign: 'center' }}
                              className="mx-1"
                              size="sm"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                            >
                              <i className="bi bi-plus"></i>
                            </Button>
                          </div>
                        </td>
                        <td className="align-middle fw-bold">{formatCurrency(item.subtotal)}</td>
                        <td className="align-middle">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveItem(item.product.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          <Card className="content-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Итого:</h4>
                <h3 className="text-primary mb-0">{formatCurrency(cart.totalAmount)}</h3>
              </div>
              <div className="d-grid">
                <Button
                  variant="brand"
                  size="lg"
                  onClick={handleOpenPaymentModal}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Оформить заказ
                </Button>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-credit-card me-2"></i>
            Выбор способа оплаты
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Способ оплаты для B2B</Form.Label>
              
              <div className="d-flex flex-column gap-2">
                <Form.Check
                  type="radio"
                  id="payment-invoice"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Выставление счета</div>
                      <small className="text-muted">Получение счета на оплату с реквизитами компании</small>
                    </div>
                  }
                  value="invoice"
                  checked={paymentMethod === 'invoice'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
                
                <Form.Check
                  type="radio"
                  id="payment-bank-transfer"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Банковский перевод</div>
                      <small className="text-muted">Прямой перевод на расчетный счет поставщика</small>
                    </div>
                  }
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
                
                <Form.Check
                  type="radio"
                  id="payment-purchase-order"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Договор поставки</div>
                      <small className="text-muted">Оформление официального договора с условиями поставки</small>
                    </div>
                  }
                  value="purchase_order"
                  checked={paymentMethod === 'purchase_order'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
                
                <Form.Check
                  type="radio"
                  id="payment-credit-line"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Кредитная линия</div>
                      <small className="text-muted">Использование предварительно согласованной кредитной линии</small>
                    </div>
                  }
                  value="credit_line"
                  checked={paymentMethod === 'credit_line'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
                
                <Form.Check
                  type="radio"
                  id="payment-deferred"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Отсроченный платеж (30 дней)</div>
                      <small className="text-muted">Оплата в течение 30 дней после получения товара</small>
                    </div>
                  }
                  value="deferred_payment"
                  checked={paymentMethod === 'deferred_payment'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
                
                <Form.Check
                  type="radio"
                  id="payment-letter-credit"
                  name="paymentMethod"
                  label={
                    <div>
                      <div className="fw-bold">Аккредитив</div>
                      <small className="text-muted">Банковская гарантия оплаты при выполнении условий</small>
                    </div>
                  }
                  value="letter_of_credit"
                  checked={paymentMethod === 'letter_of_credit'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="p-3 border rounded"
                />
              </div>
            </Form.Group>

            {cart && (
              <div className="p-3 bg-light rounded">
                <div className="d-flex justify-content-between mb-2">
                  <span>Товаров:</span>
                  <span>{cart.items.length}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="fw-bold">Итого к оплате:</span>
                  <span className="fw-bold text-primary fs-5">{formatCurrency(cart.totalAmount)}</span>
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Отмена
          </Button>
          <Button 
            variant="brand" 
            onClick={handleCheckout}
            disabled={processing}
          >
            {processing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Оформление...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Подтвердить заказ
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
