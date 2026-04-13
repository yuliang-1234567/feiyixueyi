import React, { useState, useEffect, useCallback } from 'react';
import { Pagination, Select, Spin, Empty } from 'antd';
import { HeartOutlined, EyeOutlined, CommentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getImageUrl, getFallbackImageUrl } from '../utils/imageUtils';
import { getMockArtworks } from '../data/galleryWorksMock';
import './Gallery.css';

const { Option } = Select;

const PAGE_SIZE = 12;

const Gallery = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  // 同时请求后端接口与 Mock 数据，合并后展示（后端数据在前，Mock 在后）
  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    let apiList = [];
    let apiTotal = 0;
    try {
      const res = await api.get('/artworks', {
        params: { category, page, limit: PAGE_SIZE, status: 'published' },
      });
      if (res?.data?.success && Array.isArray(res?.data?.data?.artworks)) {
        apiList = res.data.data.artworks;
        apiTotal = res.data.data.pagination?.total ?? 0;
      }
    } catch (e) {
      console.warn('获取作品列表失败', e);
    }
    const { artworks: mockList, pagination: mockPag } = getMockArtworks({ category, page, limit: PAGE_SIZE });
    setArtworks([...apiList, ...mockList]);
    setTotal(apiTotal + mockPag.total);
    setLoading(false);
  }, [category, page]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  const handleCardClick = (id) => {
    navigate(`/artworks/${id}`);
  };

  return (
    <div className="gallery-page-immersive">
      <div className="gallery-container">
        <div className="gallery-header">
          <h1 className="gallery-title">作品库</h1>
          <p className="gallery-subtitle">
            探索传统非遗技艺的数字化创新作品
          </p>
        </div>

        <div className="gallery-filters">
          <Select
            value={category}
            onChange={setCategory}
            placeholder="选择类别"
            className="category-select"
            allowClear
          >
            <Option value="剪纸">✂️ 剪纸</Option>
            <Option value="刺绣">🧵 刺绣</Option>
            <Option value="泥塑">🏺 泥塑</Option>
            <Option value="其他">🎨 其他</Option>
          </Select>
        </div>

        {loading ? (
          <div className="gallery-loading">
            <Spin size="large" />
          </div>
        ) : artworks.length === 0 ? (
          <Empty description="暂无作品" className="gallery-empty" />
        ) : (
          <>
            <div className="gallery-grid">
              {artworks.map((artwork) => (
                <div 
                  key={artwork.id}
                  className="gallery-card"
                  onClick={() => handleCardClick(artwork.id)}
                >
                  <div className="gallery-card-image-wrapper">
                    <img
                      alt={artwork.title}
                      src={getImageUrl(artwork.imageUrl)}
                      className="gallery-card-image"
                      loading="lazy"
                      onError={(e) => {
                        console.error('图片加载失败:', artwork.imageUrl);
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackImageUrl();
                      }}
                    />
                    <div className="gallery-card-category">
                      {artwork.category}
                    </div>
                  </div>
                  <div className="gallery-card-info">
                    <h3 className="gallery-card-title">{artwork.title}</h3>
                    <div className="gallery-card-stats">
                      <span className="stat-item">
                        <EyeOutlined /> {artwork.views || 0}
                      </span>
                      <span className="stat-item stat-likes">
                        <HeartOutlined /> {artwork.likesCount || 0}
                      </span>
                      <span className="stat-item">
                        <CommentOutlined /> {artwork.commentsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="gallery-pagination">
              <Pagination
                current={page}
                total={total}
                pageSize={PAGE_SIZE * 2}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;

