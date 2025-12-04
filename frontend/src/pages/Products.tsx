import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Badge, Collapse, Dropdown } from 'react-bootstrap';
import { productService } from '@/lib/productService';
import { formatCurrency } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import type { Product, Page, Category, Company } from '@/lib/types';
import PaginationComponent from '@/components/Pagination';

export default function Products() {
  const { isBuyer, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [productData, setProductData] = useState<Page<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(12);
  const [searchName, setSearchName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedCompany, setSelectedCompany] = useState<number | undefined>();
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadCompanies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterOpen) {
        loadCompanies();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearch]);

  useEffect(() => {
    if (isAuthenticated && !isBuyer) {
      // Redirect SELLER companies away from products
      navigate('/');
      return;
    }
    loadProducts();
  }, [page, size, searchName, selectedCategory, selectedCompany, minPrice, maxPrice, isBuyer, isAuthenticated]);

  async function loadCategories() {
    try {
      const data = await productService.getAllCategories({ page: 0, size: 100, availability: true });
      setCategories(data.content);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadCompanies() {
    try {
      setLoadingCompanies(true);
      const params: any = { 
        page: 0, 
        size: 100
      };
      
      // Add name filter if search is not empty
      if (companySearch.trim()) {
        params.name = companySearch.trim();
      }
      
      const response = await productService.api.get('/user-service/companies/limited', { params });
      
      // Check if response has content array
      const companiesData = response.data.content || response.data || [];
      
      // Filter only available companies
      // Note: /limited endpoint doesn't return 'type' field, so we can't filter by SELLER
      const availableCompanies = Array.isArray(companiesData) 
        ? companiesData.filter((c: Company) => c.availability !== false)
        : [];
      
      setCompanies(availableCompanies);
    } catch (error: any) {
      console.error('Failed to load companies:', error);
      console.error('Error details:', error.response?.data || error.message);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await productService.getProducts({
        name: searchName || undefined,
        categoryId: selectedCategory,
        companyId: selectedCompany,
        minPrice,
        maxPrice,
        availability: true,
        page,
        size,
      });
      setProductData(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    loadProducts();
  }

  function handleClearFilters() {
    setSearchName('');
    setSelectedCategory(undefined);
    setSelectedCompany(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPage(0);
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

  return (
    <>
      <div className="page-container">
        <div className="container-fluid">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                <i className="bi bi-box-seam me-2"></i>
                Каталог товаров
              </h1>
              <div className="opacity-90">Найдите нужный товар</div>
            </div>
          </div>

          <div className="content-card">
            {/* Search and Filter Toggle */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <h4 className="mb-0">Список товаров</h4>
                <Button 
                  variant="link" 
                  className="p-0 d-inline-flex align-items-center filter-link" 
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <span className="me-1">Фильтры</span>
                  <i className={`bi ${filterOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </Button>
              </div>
              <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); setPage(0); }}>
                <div className="searchbar d-flex position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Поиск товаров..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="control-input"
                    style={{ width: '240px', paddingRight: searchName ? '35px' : '12px' }}
                  />
                  {searchName && (
                    <Button
                      variant="link"
                      className="p-0 position-absolute"
                      style={{ right: '50px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                      onClick={() => { setSearchName(''); setPage(0); }}
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
            <Collapse in={filterOpen}>
              <div className="mb-3 p-3 bg-light rounded">
                <Row className="g-3">

                  {/* Category */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Категория</Form.Label>
                      <Form.Select
                        value={selectedCategory || ''}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value ? Number(e.target.value) : undefined);
                          setPage(0);
                        }}
                        size="sm"
                      >
                        <option value="">Все категории</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Company */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Поставщик</Form.Label>
                      <Dropdown 
                        onSelect={(key) => {
                          setSelectedCompany(key ? Number(key) : undefined);
                          setPage(0);
                        }}
                        autoClose="outside"
                      >
                        <Dropdown.Toggle 
                          id="company-filter" 
                          className="select-pill select-pill-sm w-100 text-start d-flex justify-content-between align-items-center"
                        >
                          <span className="text-truncate">
                            {selectedCompany 
                              ? companies.find(c => c.id === selectedCompany)?.name || 'Все поставщики'
                              : 'Все поставщики'
                            }
                          </span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="select-menu w-100">
                          {/* Search input inside dropdown */}
                          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
                            <Form.Control
                              type="text"
                              placeholder="Поиск по названию..."
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              size="sm"
                              autoFocus
                            />
                          </div>
                          <Dropdown.Divider className="my-1" />
                          
                          {/* All companies option */}
                          <Dropdown.Item 
                            eventKey="" 
                            active={!selectedCompany}
                          >
                            Все поставщики {!selectedCompany && <i className="bi bi-check2 ms-2" />}
                          </Dropdown.Item>
                          
                          {/* Loading state */}
                          {loadingCompanies && (
                            <Dropdown.Item disabled>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Загрузка...
                            </Dropdown.Item>
                          )}
                          
                          {/* No results */}
                          {!loadingCompanies && companies.length === 0 && companySearch && (
                            <Dropdown.Item disabled>
                              <i className="bi bi-search me-2" />
                              Ничего не найдено
                            </Dropdown.Item>
                          )}
                          
                          {/* Company list */}
                          {!loadingCompanies && companies.map((company) => (
                            <Dropdown.Item 
                              key={company.id} 
                              eventKey={company.id.toString()}
                              active={selectedCompany === company.id}
                            >
                              {company.name} {selectedCompany === company.id && <i className="bi bi-check2 ms-2" />}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Col>

                  {/* Price Range */}
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Мин. цена</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={minPrice || ''}
                        onChange={(e) => {
                          setMinPrice(e.target.value ? Number(e.target.value) : undefined);
                          setPage(0);
                        }}
                        size="sm"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label className="fw-bold small">Макс. цена</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="∞"
                        value={maxPrice || ''}
                        onChange={(e) => {
                          setMaxPrice(e.target.value ? Number(e.target.value) : undefined);
                          setPage(0);
                        }}
                        size="sm"
                      />
                    </Form.Group>
                  </Col>

                  {/* Clear Button */}
                  <Col md={2} className="d-flex align-items-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleClearFilters}
                      className="w-100"
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Сбросить
                    </Button>
                  </Col>
                </Row>
              </div>
            </Collapse>

            {/* Products Grid */}
            {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
            </div>
          ) : !productData || productData.content.length === 0 ? (
            <Card className="content-card text-center py-5">
              <Card.Body>
                <i className="bi bi-inbox display-1 text-muted"></i>
                <h4 className="mt-3">Товары не найдены</h4>
                <p className="text-muted">Попробуйте изменить параметры поиска</p>
              </Card.Body>
            </Card>
          ) : (
            <>
            <Row xs={1} sm={2} md={3} lg={4} className="g-4 mb-4">
            {productData?.content.map((product) => (
              <Col key={product.id}>
                <Card className="h-100 shadow-sm hover-shadow">
                  <Link to={`/products/${product.id}`} className="text-decoration-none">
                    {product.images.length > 0 ? (
                      <Card.Img
                        variant="top"
                        src={product.images[0].url}
                        alt={product.name}
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="bg-light d-flex align-items-center justify-content-center"
                        style={{ height: '200px' }}
                      >
                        <i className="bi bi-image display-4 text-muted"></i>
                      </div>
                    )}
                  </Link>
                  <Card.Body>
                    <Link
                      to={`/products/${product.id}`}
                      className="text-decoration-none"
                      style={{ color: 'inherit' }}
                    >
                      <Card.Title className="h6">{product.name}</Card.Title>
                    </Link>
                    <Badge 
                      className="mb-2"
                      style={{ backgroundColor: getCategoryColor(product.category.name) }}
                    >
                      {product.category.name}
                    </Badge>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="text-primary mb-0">{formatCurrency(product.price)}</h5>
                      {product.stock > 0 ? (
                        <small className="text-success">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          В наличии
                        </small>
                      ) : (
                        <small className="text-danger">
                          <i className="bi bi-x-circle-fill me-1"></i>
                          Нет в наличии
                        </small>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              ))}
            </Row>

            {/* Pagination */}
            {productData && productData.totalPages > 0 && (
              <PaginationComponent
                currentPage={productData.pageable.pageNumber}
                totalPages={productData.totalPages}
                pageSize={size}
                totalElements={productData.totalElements}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setSize(newSize);
                  setPage(0);
                }}
                pageSizeOptions={[12, 24, 48]}
              />
            )}
            </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
