import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Pagination, Select, Button, Tag, Spin, Empty, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { cartUtils } from '../utils/cart';
import { getFirstImageUrl, getFallbackImageUrl } from '../utils/imageUtils';

const { Option } = Select;

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [category, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products', {
        params: { category, page, limit: 12 },
      });
      if (response.data.success) {
        setProducts(response.data.data.products);
        setTotal(response.data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取产品列表失败', error);
      const errMsg = error.response?.data?.message || '获取产品列表失败，请稍后重试';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    cartUtils.addToCart(product, 1);
    message.success('已加入购物车');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'transparent',
      padding: '40px 24px',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
        padding: '40px 0'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '16px',
          letterSpacing: '-1px'
        }}>
          文创商城
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          发现独特的非遗文创产品，传承文化之美
        </p>
      </div>

      <div style={{ 
        marginBottom: '32px', 
        textAlign: 'right',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        <Select
          value={category}
          onChange={setCategory}
          placeholder="选择类别"
          style={{ 
            width: 200,
            borderRadius: '10px'
          }}
          allowClear
        >
          <Option value="T恤">T恤</Option>
          <Option value="手机壳">手机壳</Option>
          <Option value="帆布袋">帆布袋</Option>
          <Option value="明信片">明信片</Option>
          <Option value="其他">其他</Option>
        </Select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : products.length === 0 ? (
        <Empty description="暂无产品" />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {products.map((product) => (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/products/${product.id}`)}
                  cover={
                    <div style={{
                      position: 'relative',
                      paddingTop: '100%',
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      overflow: 'hidden'
                    }}>
                      <img
                        alt={product.name}
                        src={getFirstImageUrl(product.images) || getFallbackImageUrl()}
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.4s ease'
                        }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackImageUrl();
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                    </div>
                  }
                  actions={[
                    <Button
                      type="primary"
                      icon={<ShoppingCartOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      block
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        height: '40px',
                        fontWeight: '500'
                      }}
                    >
                      加入购物车
                    </Button>,
                  ]}
                  style={{
                    borderRadius: '16px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e8e8e8',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <Card.Meta
                    title={<div style={{ 
                      fontSize: '16px', 
                      fontWeight: 600,
                      marginBottom: '8px'
                    }}>{product.name}</div>}
                    description={
                      <div>
                        <p style={{ 
                          color: '#666', 
                          fontSize: '14px',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>{product.description}</p>
                        <div style={{ marginTop: '12px' }}>
                          <Tag style={{
                            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            ¥{product.price}
                          </Tag>
                          {product.originalPrice && (
                            <span style={{ 
                              textDecoration: 'line-through', 
                              color: '#999', 
                              marginLeft: '12px',
                              fontSize: '14px'
                            }}>
                              ¥{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Pagination
              current={page}
              total={total}
              pageSize={12}
              onChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;

