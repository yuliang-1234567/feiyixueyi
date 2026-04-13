import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingState from './components/LoadingState';
import './App.css';
import './styles/apple-design-system.css';

// 代码分割 - 懒加载页面组件
const Home = lazy(() => import('./pages/Home'));
const HeritageLearn = lazy(() => import('./pages/HeritageLearn'));
const Learn = lazy(() => import('./pages/Learn'));
const Transform = lazy(() => import('./pages/Transform'));
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

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout className="app-layout">
        <Header />
        <Content className="app-content">
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Content>
        <Footer />
      </Layout>
    </Router>
  );
}

export default App;
