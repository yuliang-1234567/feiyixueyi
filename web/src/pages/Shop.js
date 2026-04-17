import React, { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Pagination, Select, Button, Tag, Spin, Empty, message } from 'antd';
import { ShoppingCart } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { cartUtils } from '../utils/cart';
import { getFirstImageUrl, getFallbackImageUrl } from '../utils/imageUtils';
import { buildCategoryOptions, fetchProductSystem } from '../utils/productSystem';
import { LucideIcon } from "../components/icons/lucide";
import "./Shop.css";

const { Option } = Select;

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState([
    { value: 'T恤', label: 'T恤' },
    { value: '手机壳', label: '手机壳' },
    { value: '帆布袋', label: '帆布袋' },
    { value: '明信片', label: '明信片' },
    { value: '其他', label: '其他' },
  ]);

  useEffect(() => {
    let mounted = true;
    fetchProductSystem({ scene: 'shop' })
      .then((data) => {
        if (!mounted || !data?.products) return;
        const options = buildCategoryOptions(data.products);
        if (options.length) setCategoryOptions(options);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fetchProducts = useCallback(async () => {
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
  }, [category, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = (product) => {
    cartUtils.addToCart(product, 1);
    message.success({
      content: (
        <span>
          已加入购物车
          <Button
            type="link"
            className="shop-toastLink"
            onClick={() => navigate("/cart")}
          >
            去购物车
          </Button>
        </span>
      ),
      duration: 2.2,
    });
  };

  return (
    <div className="shop-page">
      <div className="shop-hero">
        <h1 className="shop-title">文创商城</h1>
        <p className="shop-subtitle">发现独特的非遗文创产品，传承文化之美</p>
      </div>

      <div className="shop-toolbar">
        <Select
          value={category}
          onChange={setCategory}
          placeholder="选择类别"
          className="shop-categorySelect"
          allowClear
        >
          {categoryOptions.map((opt) => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="shop-loading">
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
                  className="shop-productCard"
                  cover={
                    <div className="shop-cover">
                      <img
                        alt={product.name}
                        src={getFirstImageUrl(product.images) || getFallbackImageUrl()}
                        className="shop-coverImage"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackImageUrl();
                        }}
                      />
                    </div>
                  }
                  actions={[
                    <Button
                      type="primary"
                      icon={<LucideIcon icon={ShoppingCart} />}
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      block
                      className="shop-addToCartBtn"
                    >
                      加入购物车
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={<div className="shop-productName">{product.name}</div>}
                    description={
                      <div className="shop-productDescWrap">
                        <p className="shop-productDesc">{product.description}</p>
                        <div className="shop-productMeta">
                          <span className="shop-productMetaItem">免运费</span>
                          <span className="shop-productMetaDot" aria-hidden="true">·</span>
                          <span className="shop-productMetaItem">7天退换</span>
                        </div>
                        <div className="shop-priceRow">
                          <Tag className="shop-priceTag">¥{product.price}</Tag>
                          {product.originalPrice && (
                            <span className="shop-originalPrice">
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
          <div className="shop-pagination">
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

