import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Spin, Empty, Card, Row, Col, message } from 'antd';
import { Eye, Heart, MessageCircle, ShoppingCart } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getImageUrl } from '../utils/imageUtils';
import { cartUtils } from '../utils/cart';
import { getMockArtworks } from '../data/galleryWorksMock';
import MOCK_ARTWORKS from '../data/galleryWorksMock';
import './Gallery.css';
import { LucideIcon } from "../components/icons/lucide";

const Search = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  /**
   * 在mock数据中搜索作品
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的作品列表
   */
  const searchMockArtworks = useCallback((keyword) => {
    if (!keyword || !keyword.trim()) {
      // 如果没有关键词，返回所有mock作品（限制数量）
      return MOCK_ARTWORKS.slice(0, 12);
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    return MOCK_ARTWORKS.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(lowerKeyword);
      const descMatch = item.description && item.description.toLowerCase().includes(lowerKeyword);
      const categoryMatch = item.category && item.category.toLowerCase().includes(lowerKeyword);
      const tagsMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
      
      return titleMatch || descMatch || categoryMatch || tagsMatch;
    });
  }, []);

  const fetchResults = useCallback(async () => {
    setLoadingArtworks(true);
    setLoadingProducts(true);

    try {
      if (!q.trim()) {
        // 清空查询时，显示所有数据（包括mock数据）
        const { artworks: mockList } = getMockArtworks({ limit: 20 });
        
        // 同时获取后端数据
        try {
          const [artworksRes, productsRes] = await Promise.all([
            api.get('/artworks', { params: { limit: 20, status: 'published' } }),
            api.get('/products', { params: { limit: 20 } }),
          ]);

          const apiArtworks = artworksRes.data.success ? (artworksRes.data.data.artworks || []) : [];
          const apiProducts = productsRes.data.success ? (productsRes.data.data.products || []) : [];

          // 合并后端数据和mock数据（去重：如果id相同，优先使用后端数据）
          const allArtworks = [...apiArtworks];
          const apiArtworkIds = new Set(apiArtworks.map(a => String(a.id)));
          mockList.forEach(mockArtwork => {
            if (!apiArtworkIds.has(String(mockArtwork.id))) {
              allArtworks.push(mockArtwork);
            }
          });

          setArtworks(allArtworks);
          setProducts(apiProducts);
        } catch (error) {
          console.error('获取数据失败', error);
          // 如果后端请求失败，至少显示mock数据
          setArtworks(mockList);
          setProducts([]);
        }
      } else {
        // 有搜索关键词时，同时搜索后端数据和mock数据
        const [artworksRes, productsRes] = await Promise.all([
          api.get('/artworks', { params: { search: q, limit: 12, status: 'published' } }),
          api.get('/products', { params: { search: q, limit: 12 } }),
        ]);

        const apiArtworks = artworksRes.data.success ? (artworksRes.data.data.artworks || []) : [];
        const apiProducts = productsRes.data.success ? (productsRes.data.data.products || []) : [];

        // 搜索mock数据
        const mockArtworks = searchMockArtworks(q);

        // 合并搜索结果（去重）
        const allArtworks = [...apiArtworks];
        const apiArtworkIds = new Set(apiArtworks.map(a => String(a.id)));
        mockArtworks.forEach(mockArtwork => {
          if (!apiArtworkIds.has(String(mockArtwork.id))) {
            allArtworks.push(mockArtwork);
          }
        });

        setArtworks(allArtworks);
        setProducts(apiProducts);
      }
    } catch (error) {
      console.error('搜索失败', error);
      // 如果后端请求失败，至少显示mock数据搜索结果
      if (q.trim()) {
        const mockArtworks = searchMockArtworks(q);
        setArtworks(mockArtworks);
      } else {
        const { artworks: mockList } = getMockArtworks({ limit: 20 });
        setArtworks(mockList);
      }
      setProducts([]);
    } finally {
      setLoadingArtworks(false);
      setLoadingProducts(false);
    }
  }, [q, searchMockArtworks]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleAddToCart = (product, e) => {
    e?.stopPropagation?.();
    cartUtils.addToCart(product, 1);
    message.success('已加入购物车');
  };

  const loading = loadingArtworks || loadingProducts;
  const hasResults = artworks.length > 0 || products.length > 0;

  return (
    <div className="gallery-page-immersive">
      <div className="gallery-container">
        <div className="gallery-header">
          <h1 className="gallery-title">{q ? '搜索结果' : '全部作品和商品'}</h1>
          <p className="gallery-subtitle">
            {q 
              ? `关键词「${q}」共找到 ${artworks.length + products.length} 个相关结果` 
              : `共显示 ${artworks.length + products.length} 个作品和商品（清空搜索框可查看全部）`}
          </p>
        </div>

        {loading && !hasResults ? (
          <div className="gallery-loading">
            <Spin size="large" />
          </div>
        ) : !hasResults && q.trim() ? (
          <Empty description="暂无相关结果，试试其他关键词" style={{ padding: '60px 0' }} />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'all',
                label: `全部 (${artworks.length + products.length})`,
                children: (
                  <>
                    {artworks.length > 0 && (
                      <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ marginBottom: '16px', color: '#333' }}>作品 ({artworks.length})</h3>
                        <div className="gallery-grid">
                          {artworks.map((artwork) => (
                            <div
                              key={`a-${artwork.id}`}
                              className="gallery-card"
                              onClick={() => navigate(`/artworks/${artwork.id}`)}
                            >
                              <div className="gallery-card-image-wrapper">
                                <img
                                  alt={artwork.title}
                                  src={getImageUrl(artwork.imageUrl)}
                                  className="gallery-card-image"
                                  loading="lazy"
                                />
                                <div className="gallery-card-category">{artwork.category}</div>
                              </div>
                              <div className="gallery-card-info">
                                <h3 className="gallery-card-title">{artwork.title}</h3>
                                <div className="gallery-card-stats">
                                  <span className="stat-item"><LucideIcon icon={Eye} /> {artwork.views || 0}</span>
                                  <span className="stat-item stat-likes"><LucideIcon icon={Heart} /> {artwork.likesCount || 0}</span>
                                  <span className="stat-item"><LucideIcon icon={MessageCircle} /> {artwork.commentsCount || 0}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {products.length > 0 && (
                      <div>
                        <h3 style={{ marginBottom: '16px', color: '#333' }}>商品 ({products.length})</h3>
                        <Row gutter={[24, 24]}>
                          {products.map((product) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                              <Card
                                hoverable
                                onClick={() => navigate(`/products/${product.id}`)}
                                cover={
                                  <div style={{ paddingTop: '100%', position: 'relative', overflow: 'hidden' }}>
                                    <img
                                      alt={product.name}
                                      src={getImageUrl(product.images?.[0])}
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  </div>
                                }
                                actions={[
                                  <LucideIcon key="cart" icon={ShoppingCart} onClick={(e) => handleAddToCart(product, e)} style={{ cursor: "pointer" }} />,
                                ]}
                              >
                                <Card.Meta title={product.name} description={`¥${product.price || 0}`} />
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'artworks',
                label: `作品 (${artworks.length})`,
                disabled: artworks.length === 0,
                children: (
                  <div className="gallery-grid">
                    {artworks.map((artwork) => (
                      <div
                        key={artwork.id}
                        className="gallery-card"
                        onClick={() => navigate(`/artworks/${artwork.id}`)}
                      >
                        <div className="gallery-card-image-wrapper">
                          <img
                            alt={artwork.title}
                            src={getImageUrl(artwork.imageUrl)}
                            className="gallery-card-image"
                            loading="lazy"
                          />
                          <div className="gallery-card-category">{artwork.category}</div>
                        </div>
                        <div className="gallery-card-info">
                          <h3 className="gallery-card-title">{artwork.title}</h3>
                          <div className="gallery-card-stats">
                            <span className="stat-item"><LucideIcon icon={Eye} /> {artwork.views || 0}</span>
                            <span className="stat-item stat-likes"><LucideIcon icon={Heart} /> {artwork.likesCount || 0}</span>
                            <span className="stat-item"><LucideIcon icon={MessageCircle} /> {artwork.commentsCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'products',
                label: `商品 (${products.length})`,
                disabled: products.length === 0,
                children: (
                  <Row gutter={[24, 24]}>
                    {products.map((product) => (
                      <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                        <Card
                          hoverable
                          onClick={() => navigate(`/products/${product.id}`)}
                          cover={
                            <div style={{ paddingTop: '100%', position: 'relative', overflow: 'hidden' }}>
                              <img
                                alt={product.name}
                                src={getImageUrl(product.images?.[0])}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          }
                          actions={[
                            <LucideIcon key="cart" icon={ShoppingCart} onClick={(e) => handleAddToCart(product, e)} style={{ cursor: "pointer" }} />,
                          ]}
                        >
                          <Card.Meta title={product.name} description={`¥${product.price || 0}`} />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default Search;
