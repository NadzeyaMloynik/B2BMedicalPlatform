import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Badge, Table } from 'react-bootstrap';
import { getOrder } from '@/lib/productService';
import { formatCurrency, formatDate, generateReceiptPDF } from '@/lib/pdfUtils';
import type { Order } from '@/lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from '@/lib/types';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await getOrder(Number(id));
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!order || !receiptRef.current) return;

    try {
      await generateReceiptPDF(receiptRef.current, order.receipt.receiptNumber);
    } catch (error) {
      alert('Не удалось создать PDF');
    }
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

  if (!order) {
    return (
      <Container className="py-5">
        <Card className="content-card text-center">
          <Card.Body>
            <h4>Заказ не найден</h4>
            <Button variant="brand" onClick={() => navigate('/orders')}>
              Вернуться к заказам
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button variant="outline-secondary" onClick={() => navigate('/orders')} className="mb-3">
        <i className="bi bi-arrow-left me-2"></i>
        Назад к заказам
      </Button>

      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Заказ #{order.id}</h1>
            <p className="text-white-50 mb-0">от {formatDate(order.createdAt)}</p>
          </div>
          <Badge bg={ORDER_STATUS_VARIANTS[order.status]} style={{ fontSize: '1rem' }}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      {/* Order Items */}
      <Card className="content-card mb-3">
        <Card.Body>
          <h5 className="mb-3">Состав заказа</h5>
          <div className="table-responsive">
            <Table hover>
              <thead className="bg-brand-tablehead">
                <tr>
                  <th>Товар</th>
                  <th>Цена на момент покупки</th>
                  <th>Количество</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {item.product.images.length > 0 && (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            className="me-2 rounded"
                          />
                        )}
                        <div>
                          <div className="fw-bold">{item.product.name}</div>
                          <small className="text-muted">{item.product.category.name}</small>
                        </div>
                      </div>
                    </td>
                    <td className="align-middle">{formatCurrency(item.priceAtPurchase)}</td>
                    <td className="align-middle">{item.quantity} шт.</td>
                    <td className="align-middle fw-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end fw-bold">
                    Итого:
                  </td>
                  <td className="fw-bold text-primary fs-5">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Receipt */}
      {order.receipt && (
        <Card className="content-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Чек #{order.receipt.receiptNumber}</h5>
              <Button variant="brand" onClick={handleDownloadPDF}>
                <i className="bi bi-file-earmark-pdf me-2"></i>
                Скачать PDF
              </Button>
            </div>

            <div
              ref={receiptRef}
              style={{
                backgroundColor: '#fff',
                padding: '30px',
                fontFamily: 'Courier New, monospace',
                border: '3px double #0b2e4e',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '600px',
                margin: '0 auto'
              }}
            >
              <pre style={{ 
                margin: 0, 
                whiteSpace: 'pre-wrap', 
                wordWrap: 'break-word',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                color: '#333'
              }}>
                {order.receipt.details}
              </pre>
            </div>

            <div className="mt-3 text-muted">
              <small>
                <i className="bi bi-calendar me-1"></i>
                Чек выдан: {formatDate(order.receipt.issuedAt)}
              </small>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
