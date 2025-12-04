import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Badge, Form, Collapse, Button, Modal, Dropdown } from 'react-bootstrap';
import { productService } from '@/lib/productService';
import { formatCurrency, formatDate } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import type { Order, OrderStatus, Page } from '@/lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from '@/lib/types';
import Pagination from '@/components/Pagination';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

export default function SellerOrders() {
  const { accessToken, isSellerCompany, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<Page<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [searchEmail, setSearchEmail] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('PENDING');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isSellerCompany) {
      navigate('/');
      return;
    }
    if (accessToken) {
      loadOrders();
    }
  }, [accessToken, statusFilter, page, size, isSellerCompany, isAuthenticated]);

  async function loadOrders() {
    if (!accessToken) return;

    try {
      setLoading(true);
      // Get all orders and filter by seller's products
      const data = await productService.getAllOrders({
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

  function handleOpenStatusModal(order: Order) {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
  }

  async function handleUpdateStatus() {
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      await api.patch(`/product-service/orders/${selectedOrder.id}/status`, 
        { status: newStatus },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      await loadOrders();
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      alert('Не удалось обновить статус заказа');
    } finally {
      setUpdating(false);
    }
  }

  function handleExportToExcel() {
    if (!orderData || orderData.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const filteredOrders = orderData.content.filter(o => 
      !searchEmail || o.userEmail.toLowerCase().includes(searchEmail.toLowerCase())
    );

    if (filteredOrders.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Prepare data for Excel
    const excelData = filteredOrders.map(order => ({
      '№ Заказа': order.id,
      'Дата создания': formatDate(order.createdAt),
      'Email покупателя': order.userEmail,
      'Статус': ORDER_STATUS_LABELS[order.status],
      'Количество товаров': order.items.length,
      'Общая сумма (₽)': order.totalAmount,
    }));

    // Create detailed items sheet
    const itemsData: any[] = [];
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        itemsData.push({
          '№ Заказа': order.id,
          'Дата заказа': formatDate(order.createdAt),
          'Email покупателя': order.userEmail,
          'Товар': item.product.name,
          'Артикул': item.product.sku,
          'Цена за единицу (₽)': item.priceAtPurchase,
          'Количество': item.quantity,
          'Сумма (₽)': item.subtotal,
        });
      });
    });

    // Create workbook with two sheets
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(excelData);
    const ws2 = XLSX.utils.json_to_sheet(itemsData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Заказы');
    XLSX.utils.book_append_sheet(wb, ws2, 'Детали товаров');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `заказы_${date}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  }

  return (
    <>
      <div className="page-container">
        <div className="container-fluid">
          <div className="page-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="page-title">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Управление заказами
                </h1>
                <div className="opacity-90">Заказы на ваши товары</div>
              </div>
              <Button 
                className="btn btn-light"
                onClick={handleExportToExcel}
                disabled={!orderData || orderData.content.length === 0}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>
                Экспорт в Excel
              </Button>
            </div>
          </div>

          <div className="content-card">
            {/* Search and Filter Toggle */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <h4 className="mb-0">Список заказов</h4>
                <Button 
                  variant="link" 
                  className="p-0 d-inline-flex align-items-center filter-link" 
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <span className="me-1">Фильтры</span>
                  <i className={`bi ${filtersOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </Button>
              </div>
              <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); }}>
                <div className="searchbar d-flex position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Поиск по email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="control-input"
                    style={{ width: '240px', paddingRight: searchEmail ? '35px' : '12px' }}
                  />
                  {searchEmail && (
                    <Button
                      variant="link"
                      className="p-0 position-absolute"
                      style={{ right: '50px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                      onClick={() => setSearchEmail('')}
                    >
                      <i className="bi bi-x" style={{ color: '#6c757d', fontSize: '18px' }} />
                    </Button>
                  )}
                  <Button type="submit" className="btn-brand">
                    <i className="bi bi-search" />
                  </Button>
                </div>
              </Form>
            </div>

            {/* Collapsible Filters */}
            <Collapse in={filtersOpen}>
              <div className="mb-3 p-3 bg-light rounded">
                <div className="d-flex align-items-center gap-2">
                  <Form.Label className="mb-0 fw-bold small">Статус заказа:</Form.Label>
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
              </div>
            </Collapse>

            {loading && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}

            {!loading && (!orderData || orderData.content.filter(o => 
              !searchEmail || o.userEmail.toLowerCase().includes(searchEmail.toLowerCase())
            ).length === 0) ? (
        <Card className="content-card text-center py-5">
          <Card.Body>
            <i className="bi bi-inbox display-1 text-muted"></i>
            <h4 className="mt-3">Заказов нет</h4>
            <p className="text-muted">Пока нет заказов на ваши товары</p>
          </Card.Body>
        </Card>
            ) : (
              <div className="table-outline">
                <Table className="align-middle table-custom table-bordered">
                  <thead className="bg-brand-tablehead text-white">
                <tr>
                  <th>№ Заказа</th>
                  <th>Дата</th>
                  <th>Покупатель</th>
                  <th>Товаров</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
                  <tbody>
                    {orderData?.content
                      .filter(o => !searchEmail || o.userEmail.toLowerCase().includes(searchEmail.toLowerCase()))
                      .map((order) => (
                  <tr key={order.id}>
                    <td className="align-middle">
                      <Link to={`/orders/${order.id}`} className="link-blue fw-bold">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="align-middle">{formatDate(order.createdAt)}</td>
                    <td className="align-middle">
                      <small className="text-muted">{order.userEmail}</small>
                    </td>
                    <td className="align-middle">{order.items.length}</td>
                    <td className="align-middle fw-bold">{formatCurrency(order.totalAmount)}</td>
                    <td className="align-middle">
                      <Badge bg={ORDER_STATUS_VARIANTS[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="align-middle text-end">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleOpenStatusModal(order)}
                        className="me-2"
                      >
                        <i className="bi bi-arrow-repeat me-1"></i>
                        Изменить статус
                      </Button>
                      <Link to={`/orders/${order.id}`} className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-eye me-1"></i>
                        Детали
                      </Link>
                    </td>
                  </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
            
            {!loading && orderData && (
              <div className="mt-3">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-arrow-repeat me-2"></i>
            Изменить статус заказа
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <div className="mb-3">
                <strong>Заказ:</strong> #{selectedOrder.id}
              </div>
              <div className="mb-3">
                <strong>Текущий статус:</strong>{' '}
                <Badge bg={ORDER_STATUS_VARIANTS[selectedOrder.status]}>
                  {ORDER_STATUS_LABELS[selectedOrder.status]}
                </Badge>
              </div>
              <Form.Group>
                <Form.Label className="fw-bold">Новый статус</Form.Label>
                <Form.Select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Отмена
          </Button>
          <Button 
            variant="brand" 
            onClick={handleUpdateStatus}
            disabled={updating || !selectedOrder || newStatus === selectedOrder.status}
          >
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Обновление...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Обновить статус
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
