import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Tag, Empty, message, Modal, Input, Select, Popconfirm, InputNumber, Pagination } from 'antd';
import { Eye, Heart, MessageCircle, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { getFirstImageUrl } from '../utils/imageUtils';
import { buildCategoryOptions, fetchProductSystem } from '../utils/productSystem';
import { LucideIcon } from "../components/icons/lucide";

const { TextArea } = Input;
const { Option } = Select;

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    category: '', 
    price: 0, 
    stock: 0,
    status: 'published'
  });
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [categoryOptions, setCategoryOptions] = useState([
    { value: 'T恤', label: 'T恤' },
    { value: '手机壳', label: '手机壳' },
    { value: '帆布袋', label: '帆布袋' },
    { value: '明信片', label: '明信片' },
    { value: '其他', label: '其他' },
  ]);

  const fetchProducts = useCallback(async () => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/products/me/list', {
        params: { page: pagination.page, limit: pagination.limit }
      });

      if (response.data.success) {
        console.log('我的商品列表:', response.data.data.products);
        setProducts(response.data.data.products);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total
        }));
      } else {
        message.error(response.data.message || '获取商品列表失败');
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '获取商品列表失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit]);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token, fetchProducts]);

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

  const handleEdit = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: parseFloat(product.price),
      stock: product.stock || 0,
      status: product.status || 'published'
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    if (!editForm.name || !editForm.name.trim()) {
      message.warning('请输入商品名称');
      return;
    }

    if (!editForm.price || editForm.price <= 0) {
      message.warning('请输入有效的价格');
      return;
    }

    if (editForm.stock < 0) {
      message.warning('库存不能为负数');
      return;
    }

    try {
      const updateData = {
        name: editForm.name.trim(),
        description: editForm.description || '',
        category: editForm.category,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock) || 0,
        status: editForm.status
      };

      const response = await api.put(`/products/${editingProduct.id}`, updateData);

      if (response.data.success) {
        message.success('商品更新成功');
        setEditModalVisible(false);
        setEditingProduct(null);
        setEditForm({ name: '', description: '', category: '', price: 0, stock: 0, status: 'published' });
        fetchProducts();
      } else {
        message.error(response.data.message || '更新商品失败');
      }
    } catch (error) {
      console.error('更新商品失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新商品失败';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    try {
      const response = await api.delete(`/products/${id}`);
      
      if (response.data.success) {
        message.success('商品已删除');
        fetchProducts();
      } else {
        message.error(response.data.message || '删除商品失败');
      }
    } catch (error) {
      console.error('删除商品失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除商品失败';
      message.error(errorMessage);
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/shop/${id}`);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '40px 24px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <div style={{ 
        marginBottom: '40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '20px 0'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            商品管理
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#666', 
            fontSize: '1rem' 
          }}>
            管理和编辑您的商品
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<LucideIcon icon={Plus} />}
          onClick={() => navigate('/transform')}
          size="large"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '10px',
            height: '44px',
            padding: '0 24px',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          创建新商品
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Empty description="加载中..." />
        </div>
      ) : products.length === 0 ? (
        <Empty 
          description="暂无商品" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: '100px' }}
        >
          <Button type="primary" onClick={() => navigate('/transform')}>
            创建第一个商品
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {products.map(product => (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ 
                      position: 'relative', 
                      paddingTop: '100%', 
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                         onClick={() => handleViewDetail(product.id)}>
                      <img
                        src={getFirstImageUrl(product.images)}
                        alt={product.name}
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
                          console.error('图片加载失败:', product.images);
                          e.target.style.display = 'none';
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: product.status === 'published' ? '#52c41a' : product.status === 'sold_out' ? '#ff4d4f' : '#faad14',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        {product.status === 'published' ? '已上架' : product.status === 'sold_out' ? '已售罄' : '草稿'}
                      </div>
                    </div>
                  }
                  actions={[
                    <Button 
                      key="view"
                      type="text" 
                      icon={<LucideIcon icon={Eye} />}
                      onClick={() => handleViewDetail(product.id)}
                      style={{ color: '#667eea' }}
                    >
                      查看
                    </Button>,
                    <Button 
                      key="edit"
                      type="text" 
                      icon={<LucideIcon icon={Pencil} />}
                      onClick={() => handleEdit(product)}
                      style={{ color: '#52c41a' }}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个商品吗？"
                      description="删除后无法恢复"
                      onConfirm={() => handleDelete(product.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger icon={<LucideIcon icon={Trash2} />}>
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                  style={{ 
                    borderRadius: '16px', 
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e8e8e8',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 600, 
                      color: '#1a1a1a', 
                      marginBottom: '12px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 700, 
                      color: '#ff4444', 
                      marginBottom: '12px',
                      textShadow: '0 2px 4px rgba(255, 77, 79, 0.1)'
                    }}>
                      ¥{parseFloat(product.price || 0).toFixed(2)}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Tag style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        color: '#667eea',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        fontWeight: '500',
                        marginRight: '8px'
                      }}>
                        {product.category}
                      </Tag>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f0f0f0'
                    }}>
                      <div style={{ display: 'flex', gap: '16px', color: '#8c8c8c', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LucideIcon icon={ShoppingBag} size={14} strokeWidth={1.7} />
                          <span>库存 {product.stock || 0}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LucideIcon icon={Eye} size={14} strokeWidth={1.7} />
                          <span>{product.views || 0}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', color: '#8c8c8c', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff6b6b' }}>
                          <LucideIcon icon={Heart} size={14} strokeWidth={1.7} />
                          <span>{product.likesCount || 0}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LucideIcon icon={MessageCircle} size={14} strokeWidth={1.7} />
                          <span>{product.commentsCount || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          {pagination.total > pagination.limit && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Pagination
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.limit}
                onChange={(page) => setPagination(prev => ({ ...prev, page }))}
                showSizeChanger={false}
                showTotal={(total) => `共 ${total} 个商品`}
              />
            </div>
          )}
        </>
      )}

      <Modal
        title="编辑商品"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingProduct(null);
          setEditForm({ name: '', description: '', category: '', price: 0, stock: 0, status: 'published' });
        }}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>商品名称</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="请输入商品名称"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>描述</label>
            <TextArea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="请输入商品描述"
              rows={4}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>分类</label>
            <Select
              value={editForm.category}
              onChange={(value) => setEditForm({ ...editForm, category: value })}
              style={{ width: '100%' }}
            >
              {categoryOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>价格 (¥)</label>
            <InputNumber
              value={editForm.price}
              onChange={(value) => setEditForm({ ...editForm, price: value })}
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="请输入价格"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>库存</label>
            <InputNumber
              value={editForm.stock}
              onChange={(value) => setEditForm({ ...editForm, stock: value })}
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入库存"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>状态</label>
            <Select
              value={editForm.status}
              onChange={(value) => setEditForm({ ...editForm, status: value })}
              style={{ width: '100%' }}
            >
              <Option value="published">已上架</Option>
              <Option value="draft">草稿</Option>
              <Option value="sold_out">已售罄</Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManagement;

