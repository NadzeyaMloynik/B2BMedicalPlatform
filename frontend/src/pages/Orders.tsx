import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Badge, Dropdown } from 'react-bootstrap';
import { productService } from '@/lib/productService';
import { formatCurrency, formatDate } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import type { Order, OrderStatus, Page } from '@/lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from '@/lib/types';
import Pagination from '@/components/Pagination';

export default function Orders() {
  const { accessToken, isBuyer, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<Page<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  useEffect(() => {
    if (isAuthenticated && !isBuyer) {
      navigate('/');
      return;
    }
    if (accessToken) {
      loadOrders();
    }
  }, [accessToken, statusFilter, page, size, isBuyer, isAuthenticated]);

  async function loadOrders() {
    if (!accessToken) return;

    try {
      setLoading(true);
      const data = await productService.getUserOrders({
        status: statusFilter || undefined,
        page,
        size,
      });
      setOrderData(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
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

  return (
    <Container className="py-4">
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-bag-check me-2"></i>
          Мои заказы
        </h1>
      </div>

      {!orderData || orderData.content.length === 0 ? (
        <Card className="content-card text-center py-5">
          <Card.Body>
            <i className="bi bi-inbox display-1 text-muted"></i>
            <h4 className="mt-3">Заказов нет</h4>
            <p className="text-muted">У вас пока нет оформленных заказов</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className="content-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Список заказов</h5>
              <Dropdown 
                onSelect={(key) => setStatusFilter((key || '') as OrderStatus | '')}
              >
                <Dropdown.Toggle 
                  id="status-filter" 
                  className="select-pill select-pill-sm"
                >
                  {statusFilter ? ORDER_STATUS_LABELS[statusFilter] : 'Все заказы'}
                </Dropdown.Toggle>
                <Dropdown.Menu className="select-menu">
                  <Dropdown.Item 
                    eventKey="" 
                    active={!statusFilter}
                  >
                    Все заказы {!statusFilter && <i className="bi bi-check2 ms-2" />}
                  </Dropdown.Item>
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                    <Dropdown.Item 
                      key={key} 
                      eventKey={key}
                      active={statusFilter === key}
                    >
                      {label} {statusFilter === key && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Card.Body>
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-brand-tablehead">
                <tr>
                  <th>№ Заказа</th>
                  <th>Дата</th>
                  <th>Товаров</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orderData?.content.map((order) => (
                  <tr key={order.id}>
                    <td className="align-middle">
                      <Link to={`/orders/${order.id}`} className="link-blue fw-bold">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="align-middle">{formatDate(order.createdAt)}</td>
                    <td className="align-middle">{order.items.length}</td>
                    <td className="align-middle fw-bold">{formatCurrency(order.totalAmount)}</td>
                    <td className="align-middle">
                      <Badge bg={ORDER_STATUS_VARIANTS[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="align-middle text-end">
                      <Link to={`/orders/${order.id}`} className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-eye me-1"></i>
                        Детали
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {orderData && (
            <Card.Body>
              <Pagination
                currentPage={orderData.pageable.pageNumber}
                totalPages={orderData.totalPages}
                pageSize={size}
                totalElements={orderData.totalElements}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setSize(newSize);
                  setPage(0);
                }}
              />
            </Card.Body>
          )}
        </Card>
      )}
    </Container>
  );
}
