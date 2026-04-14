import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Tag, Empty, message, Modal, Input, Select, Popconfirm, Pagination } from 'antd';
import { Eye, Heart, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';
import { LucideIcon } from "../components/icons/lucide";

const { Meta } = Card;
const { TextArea } = Input;
const { Option } = Select;

const MyArtworks = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', tags: '', status: 'published' });
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const fetchArtworks = useCallback(async () => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/artworks/me/list', {
        params: { page: pagination.page, limit: pagination.limit }
      });

      if (response.data.success) {
        console.log('我的作品列表:', response.data.data.artworks);
        setArtworks(response.data.data.artworks);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total
        }));
      } else {
        message.error(response.data.message || '获取作品列表失败');
      }
    } catch (error) {
      console.error('获取作品列表失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '获取作品列表失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit]);

  useEffect(() => {
    if (token) {
      fetchArtworks();
    }
  }, [token, fetchArtworks]);

  const handleEdit = (artwork) => {
    setEditingArtwork(artwork);
    setEditForm({
      title: artwork.title,
      description: artwork.description || '',
      category: artwork.category,
      tags: artwork.tags?.join(',') || '',
      status: artwork.status || 'published'
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    if (!editForm.title || !editForm.title.trim()) {
      message.warning('请输入作品标题');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', editForm.title.trim());
      formData.append('description', editForm.description || '');
      formData.append('category', editForm.category);
      formData.append('tags', editForm.tags || '');
      formData.append('status', editForm.status);

      const response = await api.put(`/artworks/${editingArtwork.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        message.success('作品更新成功');
        setEditModalVisible(false);
        fetchArtworks();
      } else {
        message.error(response.data.message || '更新作品失败');
      }
    } catch (error) {
      console.error('更新作品失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新作品失败';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      message.warning('请先登录');
      return;
    }

    try {
      const response = await api.delete(`/artworks/${id}`);
      
      if (response.data.success) {
        message.success('作品已删除');
        fetchArtworks();
      } else {
        message.error(response.data.message || '删除作品失败');
      }
    } catch (error) {
      console.error('删除作品失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除作品失败';
      message.error(errorMessage);
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/artworks/${id}`);
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
            我的作品
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#666', 
            fontSize: '1rem' 
          }}>
            管理和编辑您的作品
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
          创建新作品
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Empty description="加载中..." />
        </div>
      ) : artworks.length === 0 ? (
        <Empty 
          description="暂无作品" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: '100px' }}
        >
          <Button type="primary" onClick={() => navigate('/transform')}>
            创建第一个作品
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {artworks.map(artwork => (
              <Col xs={24} sm={12} md={8} lg={6} key={artwork.id}>
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
                         onClick={() => handleViewDetail(artwork.id)}>
                      <img
                        src={getImageUrl(artwork.imageUrl)}
                        alt={artwork.title}
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
                          console.error('图片加载失败:', artwork.imageUrl);
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
                        color: artwork.status === 'published' ? '#52c41a' : artwork.status === 'draft' ? '#faad14' : '#ff4d4f',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        {artwork.status === 'published' ? '已发布' : artwork.status === 'draft' ? '草稿' : '隐藏'}
                      </div>
                    </div>
                  }
                  actions={[
                    <Button 
                      key="view"
                      type="text" 
                      icon={<LucideIcon icon={Eye} />}
                      onClick={() => handleViewDetail(artwork.id)}
                      style={{ color: '#667eea' }}
                    >
                      查看
                    </Button>,
                    <Button 
                      key="edit"
                      type="text" 
                      icon={<LucideIcon icon={Pencil} />}
                      onClick={() => handleEdit(artwork)}
                      style={{ color: '#52c41a' }}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个作品吗？"
                      description="删除后无法恢复"
                      onConfirm={() => handleDelete(artwork.id)}
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
                  <Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {artwork.title}
                        </span>
                        <Tag color={artwork.status === 'published' ? 'green' : artwork.status === 'draft' ? 'default' : 'red'} style={{ marginLeft: '8px', flexShrink: 0 }}>
                          {artwork.status === 'published' ? '已发布' : artwork.status === 'draft' ? '草稿' : '隐藏'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: '8px' }}>
                        <Tag>{artwork.category}</Tag>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', color: '#8c8c8c', fontSize: '14px' }}>
                          <span><LucideIcon icon={Eye} /> {artwork.views || 0}</span>
                          <span><LucideIcon icon={Heart} /> {artwork.likesCount || 0}</span>
                          <span><LucideIcon icon={MessageCircle} /> {artwork.commentsCount || 0}</span>
                        </div>
                      </div>
                    }
                  />
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
                showTotal={(total) => `共 ${total} 个作品`}
              />
            </div>
          )}
        </>
      )}

      <Modal
        title="编辑作品"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingArtwork(null);
          setEditForm({ title: '', description: '', category: '', tags: '', status: 'published' });
        }}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>标题</label>
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="请输入作品标题"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>描述</label>
            <TextArea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="请输入作品描述"
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
              <Option value="剪纸">剪纸</Option>
              <Option value="刺绣">刺绣</Option>
              <Option value="泥塑">泥塑</Option>
              <Option value="其他">其他</Option>
            </Select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>标签（用逗号分隔）</label>
            <Input
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              placeholder="例如：传统,红色,春节"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>状态</label>
            <Select
              value={editForm.status}
              onChange={(value) => setEditForm({ ...editForm, status: value })}
              style={{ width: '100%' }}
            >
              <Option value="published">已发布</Option>
              <Option value="draft">草稿</Option>
              <Option value="hidden">隐藏</Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyArtworks;

