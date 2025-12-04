import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '@/context/AuthContext';

function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="page-header text-center py-5">
        <Container>
          <h1 className="display-4 fw-bold text-white mb-4">
            B2B Платформа Медицинской Техники
          </h1>
          <p className="lead text-white-50 mb-4">
            Профессиональная площадка для покупки и продажи медицинского оборудования и принадлежностей
          </p>
          {!isAuthenticated && (
            <LinkContainer to="/login">
              <Button size="lg" variant="light" className="px-5">
                Начать работу
              </Button>
            </LinkContainer>
          )}
        </Container>
      </div>

      <Container className="py-5">
        {/* Features Section */}
        <Row className="mb-5">
          <Col lg={12} className="text-center mb-5">
            <h2 className="display-6 fw-bold mb-3">Почему выбирают нас?</h2>
            <p className="lead text-muted">Надёжное решение для бизнес-потребностей медицинской отрасли</p>
          </Col>
        </Row>
        
        <Row className="g-4 mb-5">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-hospital" style={{ fontSize: '3rem', color: '#2f7fc4' }}></i>
                </div>
                <Card.Title className="h4">Медицинское Оборудование</Card.Title>
                <Card.Text className="text-muted">
                  Диагностическая техника, аппараты УЗИ, рентген-оборудование и многое другое
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-clipboard2-pulse" style={{ fontSize: '3rem', color: '#2f7fc4' }}></i>
                </div>
                <Card.Title className="h4">Медицинские Принадлежности</Card.Title>
                <Card.Text className="text-muted">
                  Инструменты, расходные материалы, средства защиты и другие необходимые принадлежности
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-shield-check" style={{ fontSize: '3rem', color: '#2f7fc4' }}></i>
                </div>
                <Card.Title className="h4">Надёжность и Качество</Card.Title>
                <Card.Text className="text-muted">
                  Только сертифицированное оборудование от проверенных поставщиков
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* How it works */}
        <Row className="mb-5">
          <Col lg={12} className="text-center mb-5">
            <h2 className="display-6 fw-bold mb-3">Как это работает?</h2>
          </Col>
        </Row>
        
        <Row className="g-4 mb-5">
          <Col md={6}>
            <div className="content-card">
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    <i className="bi bi-cart-plus text-white" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                </div>
                <div>
                  <h4 className="fw-bold mb-2">Для Покупателей</h4>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Поиск и покупка медицинского оборудования</li>
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Сравнение предложений от разных поставщиков</li>
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Оптовые закупки по выгодным ценам</li>
                    <li><i className="bi bi-check-circle text-success me-2"></i>Профессиональная поддержка</li>
                  </ul>
                </div>
              </div>
            </div>
          </Col>
          
          <Col md={6}>
            <div className="content-card">
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    <i className="bi bi-shop text-white" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                </div>
                <div>
                  <h4 className="fw-bold mb-2">Для Продавцов</h4>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Размещение товаров на платформе</li>
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Управление каталогом и заявками</li>
                    <li className="mb-2"><i className="bi bi-check-circle text-success me-2"></i>Расширение клиентской базы</li>
                    <li><i className="bi bi-check-circle text-success me-2"></i>Повышение продаж и видимости</li>
                  </ul>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Home;
