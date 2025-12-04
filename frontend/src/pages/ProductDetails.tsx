import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Carousel, Form } from 'react-bootstrap';
import { productService } from '@/lib/productService';
import { formatCurrency } from '@/lib/pdfUtils';
import { useAuth } from '@/context/AuthContext';
import { optimizeImageUrl } from '@/lib/imageUpload';
import type { Product } from '@/lib/types';

interface CompanyLimitDto {
  id: number;
  name: string;
  type: string;
  address?: string;
  contactEmail?: string;
  logoUrl?: string;
  availability?: boolean;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyLimitDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      const data = await productService.getProduct(Number(id));
      setProduct(data);
      
      // Load company information
      if (data.companyId) {
        try {
          const companyResponse = await productService.api.get('/user-service/companies/limited', {
            params: { ids: [data.companyId], page: 0, size: 1 }
          });
          if (companyResponse.data.content && companyResponse.data.content.length > 0) {
            setCompanyInfo(companyResponse.data.content[0]);
          }
        } catch (err) {
          console.error('Failed to load company info:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart() {
    if (!product || !accessToken) return;

    try {
      setAdding(true);
      
      await productService.addToCart({
        productId: product.id,
        quantity,
      });

      alert('Товар добавлен в корзину!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Не удалось добавить товар в корзину');
    } finally {
      setAdding(false);
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

  if (!product) {
    return (
      <Container className="py-5">
        <Card className="content-card text-center">
          <Card.Body>
            <h4>Товар не найден</h4>
            <Button variant="brand" onClick={() => navigate('/products')}>
              Вернуться к каталогу
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button variant="outline-secondary" onClick={() => navigate('/products')} className="mb-3">
        <i className="bi bi-arrow-left me-2"></i>
        Назад к каталогу
      </Button>

      <Row>
        <Col lg={8}>
          <Row>
            <Col lg={12} className="mb-4">
          <Card className="content-card">
            {product.images.length > 0 ? (
              <Carousel>
                {product.images.map((img) => (
                  <Carousel.Item key={img.id}>
                    <img
                      className="d-block w-100"
                      src={img.url}
                      alt={product.name}
                      style={{ height: '400px', objectFit: 'contain' }}
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
            ) : (
              <div
                className="bg-light d-flex align-items-center justify-content-center"
                style={{ height: '400px' }}
              >
                <i className="bi bi-image display-1 text-muted"></i>
              </div>
            )}
          </Card>
            </Col>
            
            <Col lg={12}>
          <Card className="content-card">
            <Card.Body>
              <Badge bg="secondary" className="mb-2">
                {product.category.name}
              </Badge>
              <h2>{product.name}</h2>
              <div className="d-flex align-items-center mb-3">
                <h3 className="text-primary mb-0 me-3">{formatCurrency(product.price)}</h3>
                {product.stock > 0 ? (
                  <Badge bg="success">В наличии: {product.stock} шт.</Badge>
                ) : (
                  <Badge bg="danger">Нет в наличии</Badge>
                )}
              </div>

              <hr />

              <div className="mb-3">
                <h5>Описание</h5>
                <p>{product.description || 'Описание отсутствует'}</p>
              </div>

              <div className="mb-3">
                <p className="text-muted mb-1">
                  <strong>SKU:</strong> {product.sku}
                </p>
              </div>

              <hr />

              {product.stock > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>Количество</Form.Label>
                  <div className="d-flex align-items-center">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <i className="bi bi-dash"></i>
                    </Button>
                    <Form.Control
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      style={{ width: '80px', textAlign: 'center' }}
                      className="mx-2"
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    >
                      <i className="bi bi-plus"></i>
                    </Button>
                  </div>
                </Form.Group>
              )}

              <div className="d-grid gap-2">
                <Button
                  variant="brand"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || adding}
                >
                  {adding ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Добавление...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cart-plus me-2"></i>
                      Добавить в корзину
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
            </Col>
          </Row>
        </Col>
        
        {/* Company Information Sidebar */}
        <Col lg={4}>
          {companyInfo && (
            <Card className="content-card">
              <Card.Body>
                <h5 className="mb-3">
                  <i className="bi bi-building me-2"></i>
                  Поставщик
                </h5>
                
                {companyInfo.logoUrl && (
                  <div className="text-center mb-3">
                    <img
                      src={optimizeImageUrl(companyInfo.logoUrl)}
                      alt={companyInfo.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '120px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="mb-3">
                  <h6 className="fw-bold mb-2">{companyInfo.name}</h6>
                  <Badge 
                    bg={companyInfo.type === 'SELLER' ? 'success' : 'info'}
                    className="mb-2"
                  >
                    {companyInfo.type === 'SELLER' ? 'Продавец' : companyInfo.type}
                  </Badge>
                </div>
                
                {companyInfo.address && (
                  <div className="mb-2">
                    <small className="text-muted d-block">
                      <i className="bi bi-geo-alt me-1"></i>
                      <strong>Адрес:</strong>
                    </small>
                    <small>{companyInfo.address}</small>
                  </div>
                )}
                
                {companyInfo.contactEmail && (
                  <div className="mb-2">
                    <small className="text-muted d-block">
                      <i className="bi bi-envelope me-1"></i>
                      <strong>Контакт:</strong>
                    </small>
                    <small>{companyInfo.contactEmail}</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}
