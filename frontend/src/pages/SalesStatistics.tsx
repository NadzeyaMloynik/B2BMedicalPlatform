import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Form, Table, Badge, Dropdown } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { productService } from '@/lib/productService';
import { formatCurrency } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import type { Order, Category } from '@/lib/types';

interface SalesData {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  categoryStats: Array<{
    categoryName: string;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export default function SalesStatistics() {
  const { accessToken, isSellerCompany, isAuthenticated, companyId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [salesData, setSalesData] = useState<SalesData>({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
    topProducts: [],
    categoryStats: [],
    dailySales: []
  });

  useEffect(() => {
    if (isAuthenticated && !isSellerCompany) {
      navigate('/');
      return;
    }
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated, isSellerCompany]);

  useEffect(() => {
    if (accessToken && companyId) {
      loadOrders();
    }
  }, [accessToken, companyId, period, selectedCategory]);

  async function loadCategories() {
    try {
      const data = await productService.getAllCategories({ page: 0, size: 100 });
      console.log('Loaded categories:', data.content);
      console.log('Categories count:', data.content.length);
      // Filter active categories
      const activeCategories = data.content.filter(cat => cat.isActive || cat.availability);
      console.log('Active categories:', activeCategories);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadOrders() {
    if (!accessToken || !companyId) return;

    try {
      setLoading(true);
      
      // Get all orders
      const allOrders = await productService.getAllOrders({
        page: 0,
        size: 1000,
      });

      // Filter orders by period and company's products
      const now = new Date();
      const periodStart = new Date();
      if (period === 'week') {
        periodStart.setDate(now.getDate() - 7);
      } else {
        periodStart.setMonth(now.getMonth() - 1);
      }

      const filteredOrders = allOrders.content.filter(order => {
        const orderDate = new Date(order.createdAt);
        const isInPeriod = orderDate >= periodStart && orderDate <= now;
        
        // Check if order contains products from seller's company
        const hasSellerProducts = order.items.some(item => item.product.companyId === companyId);
        
        // Filter by category if selected
        if (selectedCategory) {
          const hasCategory = order.items.some(
            item => item.product.category.id === Number(selectedCategory) && item.product.companyId === companyId
          );
          return isInPeriod && hasSellerProducts && hasCategory;
        }
        
        return isInPeriod && hasSellerProducts;
      });

      setOrders(filteredOrders);
      calculateStatistics(filteredOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStatistics(orders: Order[]) {
    // Filter order items to only include seller's products
    const sellerItems = orders.flatMap(order => 
      order.items.filter(item => {
        const matchesCompany = item.product.companyId === companyId;
        const matchesCategory = !selectedCategory || item.product.category.id === Number(selectedCategory);
        return matchesCompany && matchesCategory;
      })
    );

    const totalRevenue = sellerItems.reduce((sum, item) => sum + item.subtotal, 0);
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length;

    // Calculate top products
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    sellerItems.forEach(item => {
      const existing = productMap.get(item.product.name) || { quantity: 0, revenue: 0 };
      productMap.set(item.product.name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.subtotal
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productName, data]) => ({ productName, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate category stats
    const categoryMap = new Map<string, { quantity: number; revenue: number }>();
    sellerItems.forEach(item => {
      const categoryName = item.product.category.name;
      const existing = categoryMap.get(categoryName) || { quantity: 0, revenue: 0 };
      categoryMap.set(categoryName, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.subtotal
      });
    });

    const categoryStats = Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({ categoryName, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate daily sales
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      
      // Calculate revenue for this order from seller's items only
      const orderRevenue = order.items
        .filter(item => {
          const matchesCompany = item.product.companyId === companyId;
          const matchesCategory = !selectedCategory || item.product.category.id === Number(selectedCategory);
          return matchesCompany && matchesCategory;
        })
        .reduce((sum, item) => sum + item.subtotal, 0);
      
      const existing = dailyMap.get(dateKey) || { orders: 0, revenue: 0 };
      dailyMap.set(dateKey, {
        orders: existing.orders + 1,
        revenue: existing.revenue + orderRevenue
      });
    });

    const dailySales = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('.');
        const [dayB, monthB] = b.date.split('.');
        return monthA === monthB ? Number(dayA) - Number(dayB) : Number(monthA) - Number(monthB);
      });

    setSalesData({
      totalOrders: orders.length,
      totalRevenue,
      completedOrders,
      pendingOrders,
      topProducts,
      categoryStats,
      dailySales
    });
  }

  function getCategoryColor(name: string): string {
    const colors = [
      '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
      '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0',
      '#6c757d', '#1e7e34', '#5a6268', '#bd2130', '#d39e00'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
          <i className="bi bi-graph-up me-2"></i>
          Статистика продаж
        </h1>
        <p className="text-white-50 mb-0">Аналитика продаж ваших товаров</p>
      </div>

      {/* Filters */}
      <Card className="content-card mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold small">Период</Form.Label>
                <Dropdown 
                  onSelect={(key) => setPeriod(key as 'week' | 'month')}
                >
                  <Dropdown.Toggle 
                    id="period-filter" 
                    className="select-pill select-pill-sm w-100 text-start d-flex justify-content-between align-items-center"
                  >
                    <span>{period === 'week' ? 'Последние 7 дней' : 'Последние 30 дней'}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="select-menu w-100">
                    <Dropdown.Item 
                      eventKey="week" 
                      active={period === 'week'}
                    >
                      Последние 7 дней {period === 'week' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                    <Dropdown.Item 
                      eventKey="month" 
                      active={period === 'month'}
                    >
                      Последние 30 дней {period === 'month' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold small">Категория</Form.Label>
                <Dropdown 
                  onSelect={(key) => setSelectedCategory(key ? Number(key) : '')}
                >
                  <Dropdown.Toggle 
                    id="category-filter" 
                    className="select-pill select-pill-sm w-100 text-start d-flex justify-content-between align-items-center"
                  >
                    <span className="text-truncate">
                      {selectedCategory 
                        ? categories.find(c => c.id === selectedCategory)?.name || 'Все категории'
                        : 'Все категории'
                      }
                    </span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="select-menu w-100">
                    <Dropdown.Item 
                      eventKey="" 
                      active={!selectedCategory}
                    >
                      Все категории {!selectedCategory && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                    {categories.length > 0 && <Dropdown.Divider className="my-1" />}
                    {categories.length === 0 && (
                      <Dropdown.Item disabled>
                        <i className="bi bi-info-circle me-2" />
                        Категории не найдены
                      </Dropdown.Item>
                    )}
                    {categories.map(cat => (
                      <Dropdown.Item 
                        key={cat.id} 
                        eventKey={cat.id.toString()}
                        active={selectedCategory === cat.id}
                      >
                        {cat.name} {selectedCategory === cat.id && <i className="bi bi-check2 ms-2" />}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="content-card h-100">
            <Card.Body className="text-center">
              <i className="bi bi-receipt display-4 text-primary mb-2"></i>
              <h6 className="text-muted mb-2">Всего заказов</h6>
              <h2 className="mb-0">{salesData.totalOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="content-card h-100">
            <Card.Body className="text-center">
              <i className="bi bi-currency-dollar display-4 text-success mb-2"></i>
              <h6 className="text-muted mb-2">Общая выручка</h6>
              <h2 className="mb-0">{formatCurrency(salesData.totalRevenue)}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="content-card h-100">
            <Card.Body className="text-center">
              <i className="bi bi-check-circle display-4 text-success mb-2"></i>
              <h6 className="text-muted mb-2">Завершено</h6>
              <h2 className="mb-0">{salesData.completedOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="content-card h-100">
            <Card.Body className="text-center">
              <i className="bi bi-clock-history display-4 text-warning mb-2"></i>
              <h6 className="text-muted mb-2">В обработке</h6>
              <h2 className="mb-0">{salesData.pendingOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sales Charts */}
      {salesData.dailySales.length > 0 && (
        <Row className="mb-4">
          <Col lg={6} className="mb-4">
            <Card className="content-card">
              <Card.Body>
                <h5 className="mb-3">
                  <i className="bi bi-graph-up-arrow me-2"></i>
                  Динамика продаж
                </h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Выручка'];
                        return [value, 'Заказы'];
                      }}
                    />
                    <Legend 
                      formatter={(value: string) => {
                        if (value === 'revenue') return 'Выручка';
                        if (value === 'orders') return 'Заказы';
                        return value;
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#0d6efd" strokeWidth={2} name="orders" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#198754" strokeWidth={2} name="revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
            <Card className="content-card">
              <Card.Body>
                <h5 className="mb-3">
                  <i className="bi bi-bar-chart-fill me-2"></i>
                  Выручка по дням
                </h5>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                    />
                    <Legend formatter={() => 'Выручка'} />
                    <Bar dataKey="revenue" fill="#198754" name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        {/* Top Products */}
        <Col lg={6} className="mb-4">
          <Card className="content-card">
            <Card.Body>
              <h5 className="mb-3">
                <i className="bi bi-star me-2"></i>
                Топ товары
              </h5>
              {salesData.topProducts.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox display-4 mb-3"></i>
                  <p>Нет данных за выбранный период</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead className="bg-light">
                      <tr>
                        <th>Товар</th>
                        <th className="text-center">Продано</th>
                        <th className="text-end">Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.topProducts.map((product, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <Badge bg="secondary" className="me-2">{index + 1}</Badge>
                              {product.productName}
                            </div>
                          </td>
                          <td className="text-center">{product.quantity}</td>
                          <td className="text-end fw-bold">{formatCurrency(product.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Category Statistics */}
        <Col lg={6} className="mb-4">
          <Card className="content-card">
            <Card.Body>
              <h5 className="mb-3">
                <i className="bi bi-pie-chart me-2"></i>
                Продажи по категориям
              </h5>
              {salesData.categoryStats.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox display-4 mb-3"></i>
                  <p>Нет данных за выбранный период</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead className="bg-light">
                      <tr>
                        <th>Категория</th>
                        <th className="text-center">Продано</th>
                        <th className="text-end">Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.categoryStats.map((category, index) => (
                        <tr key={index}>
                          <td>
                            <Badge 
                              style={{ backgroundColor: getCategoryColor(category.categoryName) }}
                            >
                              {category.categoryName}
                            </Badge>
                          </td>
                          <td className="text-center">{category.quantity}</td>
                          <td className="text-end fw-bold">{formatCurrency(category.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
