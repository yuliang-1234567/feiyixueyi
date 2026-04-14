import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Breadcrumb, Image, InputNumber, message, Modal, Spin, Row, Col, Card, Tag } from 'antd';
import { Home, Minus, Plus, ShoppingCart, Trash2, X, ZoomIn } from "lucide-react";
import api from '../utils/api';
import { cartUtils } from '../utils/cart';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';
import './ProductDetail.css';
import { LucideIcon } from "../components/icons/lucide";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [email, setEmail] = useState('');
  const [showDetailPreview, setShowDetailPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const images = useMemo(() => {
    const list = Array.isArray(product?.images) ? product.images : [];
    return list.filter(Boolean);
  }, [product]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [id]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${id}`);
      if (response.data.success) {
        setProduct(response.data.data.product);
      } else {
        message.error('获取商品详情失败');
        navigate('/shop');
      }
    } catch (error) {
      console.error('获取商品详情失败:', error);
      message.error('获取商品详情失败');
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchRelatedProducts = useCallback(async () => {
    try {
      const response = await api.get('/products', {
        params: { limit: 8, status: 'published' }
      });
      if (response.data.success) {
        // 排除当前商品
        const related = (response.data.data.products || []).filter(p => p.id !== parseInt(id));
        setRelatedProducts(related.slice(0, 8));
      }
    } catch (error) {
      console.error('获取相关商品失败:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchRelatedProducts();
    }
  }, [id, fetchProduct, fetchRelatedProducts]);

  const handleAddToCart = () => {
    if (!user) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    cartUtils.addToCart(product, quantity);
    message.success('已加入购物车');
  };

  const handleBuyNow = () => {
    if (!user) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    cartUtils.addToCart(product, quantity);
    navigate('/payment');
  };

  const handleSubscribe = () => {
    if (email) {
      // 处理订阅逻辑
      console.log('订阅邮箱:', email);
      message.success('订阅成功！');
      setEmail('');
    }
  };

  // 是否为当前用户自己的商品（创建者或管理员可删除）
  const isOwner = user && (Number(product?.creatorId) === Number(user?.id) || user?.role === 'admin');

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除该商品吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          await api.delete(`/products/${id}`);
          message.success('商品已删除');
          navigate('/shop');
        } catch (error) {
          message.error(error.response?.data?.message || '删除失败');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const activeImage = images[activeImageIdx] || product.images?.[0] || '';
  const stock = Number(product.stock ?? 0);
  const stockLevel =
    stock <= 0 ? "out" : stock <= 10 ? "low" : "ok";

  return (
    <div className="product-detail-page">
      {/* 面包屑导航 */}
      <div className="product-breadcrumb">
        <Breadcrumb
          items={[
            { title: <LucideIcon icon={Home} />, href: '/' },
            { title: '文创商城', href: '/shop' },
            { title: product.category || '其他', href: `/shop?category=${product.category}` },
            { title: product.name }
          ]}
        />
        <Button
          type="text"
          icon={<LucideIcon icon={X} />}
          onClick={() => navigate('/shop')}
          className="close-btn"
        />
      </div>

      {/* 产品详情主体 */}
      <div className="product-detail-main">
        <Row gutter={[60, 40]}>
          {/* 左侧：产品图片 */}
          <Col xs={24} lg={12}>
            <div className="product-image-section">
              <div className="product-main-image-wrapper">
                <img
                  src={getImageUrl(activeImage)}
                  alt={product.name}
                  className="product-main-image"
                />
                <Button
                  className="detail-preview-btn"
                  icon={<LucideIcon icon={ZoomIn} />}
                  onClick={() => setShowDetailPreview(true)}
                >
                  细节预览
                </Button>
              </div>
              {images.length > 1 && (
                <div className="product-thumbs" aria-label="商品图片缩略图">
                  {images.slice(0, 6).map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      className={
                        idx === activeImageIdx
                          ? "product-thumb product-thumb-active"
                          : "product-thumb"
                      }
                      onClick={() => setActiveImageIdx(idx)}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`${product.name} 缩略图 ${idx + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Col>

          {/* 右侧：产品信息 */}
          <Col xs={24} lg={12}>
            <div className="product-info-section">
              <h1 className="product-title">{product.name}</h1>
              <div className="product-subtitle">大师监制 · {product.category || '非遗产品'}</div>
              
              {/* 价格区域 */}
              <div className="product-price-section">
                <span className="current-price">¥{product.price}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="original-price">¥{product.originalPrice}</span>
                    <Tag color="red" className="discount-badge">限时特惠</Tag>
                  </>
                )}
              </div>

              {/* 产品描述 */}
              <div className="product-description-section">
                <div className="description-item">
                  <div className="description-label">工艺传承</div>
                  <div className="description-content">
                    {product.craftsmanship || '传统手工制作，传承千年技艺，每一件作品都凝聚着匠人的心血与智慧。'}
                  </div>
                </div>
                <div className="description-item">
                  <div className="description-label">文化寓意</div>
                  <div className="description-content">
                    {product.culturalMeaning || '承载深厚的文化内涵，体现传统与现代的完美融合。'}
                  </div>
                </div>
              </div>

              {/* 规格信息 */}
              <div className="product-specs">
                <div className="spec-item">
                  <span className="spec-label">材质：</span>
                  <span className="spec-value">{product.material || '高白泥、钴蓝料'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">尺寸：</span>
                  <span className="spec-value">{product.size || '高32cm/腹径18cm'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">产地：</span>
                  <span className="spec-value">{product.origin || '江西景德镇'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">库存：</span>
                  <span
                    className={
                      stockLevel === "out"
                        ? "spec-value stock-warning stock-out"
                        : stockLevel === "low"
                        ? "spec-value stock-warning stock-low"
                        : "spec-value stock-ok"
                    }
                  >
                    {stock > 0 ? `库存 ${stock} 件` : "已售罄"}
                  </span>
                </div>
              </div>

              {/* 数量选择 */}
              <div className="quantity-section">
                <span className="quantity-label">数量：</span>
                <div className="quantity-controls">
                  <Button
                    icon={<LucideIcon icon={Minus} />}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  />
                  <InputNumber
                    min={1}
                    max={product.stock || 999}
                    value={quantity}
                    onChange={(value) => setQuantity(value || 1)}
                    className="quantity-input"
                  />
                  <Button
                    icon={<LucideIcon icon={Plus} />}
                    onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                    disabled={quantity >= (product.stock || 999)}
                  />
                </div>
              </div>

              {/* 服务保障 */}
              <div className="service-guarantee">免运费 · 7天无理由退换</div>

              {/* 操作按钮 */}
              <div className="product-actions">
                <Button
                  className="buy-now-btn"
                  onClick={handleBuyNow}
                  disabled={!product.stock || product.stock <= 0}
                >
                  立即购买
                </Button>
                <Button
                  type="primary"
                  icon={<LucideIcon icon={ShoppingCart} />}
                  className="add-cart-btn"
                  onClick={handleAddToCart}
                  disabled={!product.stock || product.stock <= 0}
                >
                  加入购物车
                </Button>
              </div>
              {/* 商品创建者或管理员可删除 */}
              {isOwner && (
                <div className="product-owner-actions">
                  <Button
                    type="text"
                    danger
                    icon={<LucideIcon icon={Trash2} />}
                    onClick={handleDelete}
                    loading={deleting}
                  >
                    删除商品
                  </Button>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* 相关产品推荐 */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="section-container">
            <h2 className="section-title">您可能也喜欢</h2>
            <Row gutter={[24, 24]}>
              {relatedProducts.map((item) => (
                <Col xs={12} sm={8} md={6} lg={3} key={item.id}>
                  <Card
                    hoverable
                    cover={
                      <img
                        alt={item.name}
                        src={getImageUrl(item.images?.[0] || '')}
                        className="related-product-image"
                      />
                    }
                    onClick={() => navigate(`/products/${item.id}`)}
                    className="related-product-card"
                  >
                    <div className="related-product-location">{item.category || '非遗产品'}</div>
                    <div className="related-product-name">{item.name}</div>
                    <div className="related-product-price">¥{item.price}</div>
                    {item.sales > 0 && (
                      <div className="related-product-sales">{item.sales}人已购买</div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <Button type="default" onClick={() => navigate('/shop')}>
                加载更多好物
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 订阅表单 */}
      <section className="subscribe-section-detail">
        <div className="section-container">
          <div className="subscribe-content">
            <div className="subscribe-quote">"技可进乎道,艺可通乎神"</div>
            <p className="subscribe-desc">
              订阅我们的通讯,每周获取非遗大师访谈与新品首发资讯。
            </p>
            <div className="subscribe-form">
              <input
                type="email"
                placeholder="您的电子邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="subscribe-input"
              />
              <Button type="primary" onClick={handleSubscribe} className="subscribe-btn">
                订阅
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 细节预览模态框 */}
      {showDetailPreview && (
        <div className="detail-preview-modal" onClick={() => setShowDetailPreview(false)}>
          <div className="detail-preview-content" onClick={(e) => e.stopPropagation()}>
            <Button
              type="text"
              icon={<LucideIcon icon={X} />}
              onClick={() => setShowDetailPreview(false)}
              className="preview-close-btn"
            />
            <Image
              src={getImageUrl(activeImage)}
              alt={product.name}
              className="preview-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
