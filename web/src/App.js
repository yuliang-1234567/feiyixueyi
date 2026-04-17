import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import LoadingState from './components/LoadingState';
import { useAuthStore } from './store/authStore';
import './App.css';
import './styles/apple-design-system.css';

// 代码分割 - 懒加载页面组件
const Home = lazy(() => import('./pages/Home'));
const HeritageLearn = lazy(() => import('./pages/HeritageLearn'));
const Learn = lazy(() => import('./pages/Learn'));
const Transform = lazy(() => import('./pages/Transform'));
const HeritageSketch = lazy(() => import('./pages/HeritageSketch'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Shop = lazy(() => import('./pages/Shop'));
const Cart = lazy(() => import('./pages/Cart'));
const Payment = lazy(() => import('./pages/Payment'));
const Orders = lazy(() => import('./pages/Orders'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const MyArtworks = lazy(() => import('./pages/MyArtworks'));
const ArtworkDetail = lazy(() => import('./pages/ArtworkDetail'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const Search = lazy(() => import('./pages/Search'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminArtworks = lazy(() => import('./pages/admin/AdminArtworks'));
const AdminFavorites = lazy(() => import('./pages/admin/AdminFavorites'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminAiMonitor = lazy(() => import('./pages/admin/AdminAiMonitor'));

const { Content } = Layout;

function AppRoutes() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const { user, isAuthenticated } = useAuthStore();
  const isAdminLoggedIn = !!user && isAuthenticated && user.role === 'admin';
  const contentStyle = isAdminPath
    ? { padding: 0, marginTop: 0, minHeight: '100vh' }
    : undefined;

  if (isAdminLoggedIn && !isAdminPath) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Layout className="app-layout">
      {!isAdminPath ? <Header /> : null}
      <Content className="app-content" style={contentStyle}>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/heritage-learn" element={<HeritageLearn />} />
            <Route path="/learn" element={<Learn />} />
            <Route
              path="/transform"
              element={
                <ProtectedRoute>
                  <Transform />
                </ProtectedRoute>
              }
            />
            <Route
              path="/heritage-sketch"
              element={
                <ProtectedRoute>
                  <HeritageSketch />
                </ProtectedRoute>
              }
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artworks/me"
              element={
                <ProtectedRoute>
                  <MyArtworks />
                </ProtectedRoute>
              }
            />
            <Route path="/search" element={<Search />} />
            <Route path="/artworks/:id" element={<ArtworkDetail />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route
              path="/products/me"
              element={
                <ProtectedRoute>
                  <ProductManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="artworks" element={<AdminArtworks />} />
              <Route path="favorites" element={<AdminFavorites />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="ai-monitor" element={<AdminAiMonitor />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Content>
      {!isAdminPath ? <Footer /> : null}
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
