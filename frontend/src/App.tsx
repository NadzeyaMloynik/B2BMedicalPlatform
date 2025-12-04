import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppNavbar from './components/Navbar';
import Home from './pages/Home';
import ApiExplorer from './pages/ApiExplorer';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AdminCompanies from './pages/AdminCompanies';
import CompanyDetails from './pages/CompanyDetails';
import MyCompany from './pages/MyCompany';
import Profile from './pages/Profile';
import ErrorToasts from './components/ErrorToasts';
import Footer from './components/Footer';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Categories from './pages/Categories';
import AddProduct from './pages/AddProduct';
import MyProducts from './pages/MyProducts';
import SellerOrders from './pages/SellerOrders';
import SalesStatistics from './pages/SalesStatistics';

function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <AppNavbar />
      <ErrorToasts />
      <Container className="py-4 flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/api" element={<ApiExplorer />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/company" element={<MyCompany />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products/add" element={<AddProduct />} />
            <Route path="/my-products" element={<MyProducts />} />
            <Route path="/seller-orders" element={<SellerOrders />} />
            <Route path="/sales-statistics" element={<SalesStatistics />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/companies/:id" element={<CompanyDetails />} />
          </Route>
        </Routes>
      </Container>
      <Footer />
    </div>
  );
}

export default App;
