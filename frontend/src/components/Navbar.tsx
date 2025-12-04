import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '@/context/AuthContext';
import uniLogo from '@/resources/images/uni-logo.jpg';

function AppNavbar() {
  const { isAuthenticated, isAdmin, isSeller, isBuyer, isSellerCompany, logout } = useAuth();

  return (
    <Navbar expand="md" className="navbar-dark bg-brand-nav border-bottom">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="fw-bold d-flex align-items-center">
            <img 
              src={uniLogo} 
              alt="UNI medtech logo" 
              style={{ height: '32px', width: 'auto', marginRight: '10px' }}
            />
            UNI medtech
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Главная</Nav.Link>
            </LinkContainer>
            {isAuthenticated && isBuyer && (
              <>
                <LinkContainer to="/products">
                  <Nav.Link>Товары</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/orders">
                  <Nav.Link>Мои заказы</Nav.Link>
                </LinkContainer>
              </>
            )}
            {isAuthenticated && isSellerCompany && (
              <>
                <LinkContainer to="/my-products">
                  <Nav.Link>Мои товары</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/categories">
                  <Nav.Link>Категории</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/seller-orders">
                  <Nav.Link>Заказы</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/sales-statistics">
                  <Nav.Link>Статистика</Nav.Link>
                </LinkContainer>
              </>
            )}
            {isAuthenticated && (
              <>
                {isAdmin ? (
                  <LinkContainer to="/admin/companies">
                    <Nav.Link>Компании</Nav.Link>
                  </LinkContainer>
                ) : (
                  <LinkContainer to="/company">
                    <Nav.Link>Моя компания</Nav.Link>
                  </LinkContainer>
                )}
              </>
            )}
          </Nav>
          <Nav className="ms-auto">
            {!isAuthenticated ? (
              <LinkContainer to="/login">
                <Nav.Link className="text-white">Вход</Nav.Link>
              </LinkContainer>
            ) : (
              <>
                {isBuyer && (
                  <LinkContainer to="/cart">
                    <Nav.Link className="text-white" title="Корзина">
                      <i className="bi bi-cart3" style={{ fontSize: '1.3rem' }}></i>
                    </Nav.Link>
                  </LinkContainer>
                )}
                <LinkContainer to="/profile">
                  <Nav.Link className="text-white" title="Профиль">
                    <i className="bi bi-person-circle" style={{ fontSize: '1.3rem' }}></i>
                  </Nav.Link>
                </LinkContainer>
                <Nav.Link className="text-white" onClick={logout}>Выход</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
