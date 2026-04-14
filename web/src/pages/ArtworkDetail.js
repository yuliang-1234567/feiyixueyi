import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Tag, Statistic, Image, Avatar, Input, List, message, Empty, Popconfirm, Divider, Tabs } from 'antd';
import { BarChart3, ChevronLeft, Eye, Heart, MessageCircle, Trash2, User } from "lucide-react";
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';
import { getMockArtworkById, isMockArtworkId } from '../data/galleryWorksMock';
import { LucideIcon } from "../components/icons/lucide";
import "./ArtworkDetail.css";
// 使用原生日期格式化，避免引入 moment
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const { TextArea } = Input;

const ArtworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [artwork, setArtwork] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [stats, setStats] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const fetchArtwork = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/artworks/${id}`);

      if (response.data.success) {
        const artworkData = response.data.data.artwork;
        console.log('作品详情数据:', artworkData);
        setArtwork(artworkData);
        setIsLiked(artworkData.isLiked || false);
        setLikesCount(artworkData.likesCount || 0);
      } else {
        message.error(response.data.message || '获取作品详情失败');
      }
    } catch (error) {
      if (isMockArtworkId(id)) {
        const m = getMockArtworkById(id);
        if (m) {
          setArtwork(m);
          setIsLiked(m.isLiked || false);
          setLikesCount(m.likesCount || 0);
        } else {
          message.error('作品不存在');
        }
      } else {
        console.error('获取作品详情失败:', error);
        message.error(error.response?.data?.message || error.message || '获取作品详情失败');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    setCommentLoading(true);
    try {
      const response = await api.get('/comments', {
        params: { targetType: 'artwork', targetId: id, page: 1, limit: 20 }
      });

      if (response.data.success) {
        setComments(response.data.data.comments);
      }
    } catch (error) {
      if (isMockArtworkId(id)) {
        setComments([]);
      } else {
        console.error('获取评论失败:', error);
        message.error('获取评论失败');
      }
    } finally {
      setCommentLoading(false);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get(`/artworks/${id}/stats`);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 不显示错误，因为可能不是作品所有者
    }
  }, [id, token]);

  useEffect(() => {
    fetchArtwork();
    fetchComments();
  }, [fetchArtwork, fetchComments]);

  useEffect(() => {
    if (token && artwork && (artwork.authorId === user?.id || user?.role === 'admin')) {
      fetchStats();
    }
  }, [token, artwork, user, fetchStats]);

  const handleLike = async () => {
    if (!token) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    if (isMockArtworkId(artwork?.id)) {
      message.info('模拟作品仅作展示，暂不支持点赞');
      return;
    }

    try {
      const response = await api.post(`/artworks/${id}/like`);

      if (response.data.success) {
        setIsLiked(response.data.data.isLiked);
        setLikesCount(response.data.data.likes);
        message.success(response.data.message);
        // 更新作品数据
        if (artwork) {
          setArtwork({
            ...artwork,
            isLiked: response.data.data.isLiked,
            likesCount: response.data.data.likes
          });
        }
      } else {
        message.error(response.data.message || '操作失败');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '操作失败';
      message.error(errorMessage);
    }
  };

  const handleComment = async () => {
    if (!token) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (!commentText.trim()) {
      message.warning('请输入评论内容');
      return;
    }
    if (isMockArtworkId(artwork?.id)) {
      message.info('模拟作品仅作展示，暂不支持评论');
      return;
    }

    try {
      const response = await api.post('/comments', {
        targetType: 'artwork',
        targetId: parseInt(id),
        content: commentText.trim()
      });

      if (response.data.success) {
        message.success('评论成功');
        setCommentText('');
        fetchComments();
        fetchArtwork(); // 更新评论数
      } else {
        message.error(response.data.message || '评论失败');
      }
    } catch (error) {
      console.error('评论失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '评论失败';
      message.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!token) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      const response = await api.delete(`/artworks/${id}`);
      
      if (response.data.success) {
        message.success('作品已删除');
        navigate('/artworks/me');
      } else {
        message.error(response.data.message || '删除作品失败');
      }
    } catch (error) {
      console.error('删除作品失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除作品失败';
      message.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="artwork-detail-loading">加载中...</div>;
  }

  if (!artwork) {
    return <Empty description="作品不存在" />;
  }

  const isOwner = token && user && (artwork.authorId === user.id || user.role === 'admin');
  const canInteract = !!token && !isMockArtworkId(artwork?.id);

  return (
    <div className="artwork-detail-page">
      <Button 
        icon={<LucideIcon icon={ChevronLeft} />} 
        onClick={() => navigate(-1)}
        className="artwork-detail-backBtn"
      >
        返回
      </Button>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={14}>
          <Card className="artwork-detail-imageCard">
            <Image
              src={getImageUrl(artwork.imageUrl)}
              alt={artwork.title}
              className="artwork-detail-image"
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBuyhJLqOIMQ17Zx0rCzIyc1MwA0fkhcWFv6e//5d4GBg1IhF+DQf+v//7/3//3cxYGD4Jlv8/wcA0YFh4O12AgAAAFZlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA5KGAAcAAAASAAAARKACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAABBU0NJSQAAAFNjcmVlbnNob3TlBmdZAAAB1mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4xOTU8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTk0PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6VXNlckNvbW1lbnQ+U2NyZWVuc2hvdDwvZXhpZjpVc2VyQ29tbWVudD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Chjd7gAAADtJREFUaEPt0DEBAAAAwqD1T20JT6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgAtd8AAYizw/EAAAAASUVORK5CYII="
              onError={(e) => {
                console.error('图片加载失败:', artwork.imageUrl);
                e.target.style.display = 'none';
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="artwork-detail-infoCard">
            <h1 className="artwork-detail-title">{artwork.title}</h1>

            <div className="artwork-detail-tags">
              <Tag className="artwork-detail-tagPrimary">
                {artwork.category}
              </Tag>
              {artwork.tags?.map((tag, index) => (
                <Tag key={index} className="artwork-detail-tag">
                  {tag}
                </Tag>
              ))}
            </div>

            {artwork.description && (
              <p className="artwork-detail-desc">
                {artwork.description}
              </p>
            )}

            <Divider style={{ margin: '24px 0' }} />

            <div className="artwork-detail-stats">
              <Statistic
                title="浏览"
                value={artwork.views || 0}
                prefix={<LucideIcon icon={Eye} className="artwork-detail-statIcon" />}
                valueStyle={{ fontSize: '24px', color: '#1a1a1a', fontWeight: '700' }}
              />
              <Statistic
                title="点赞"
                value={likesCount}
                prefix={<LucideIcon icon={Heart} className="artwork-detail-statIcon artwork-detail-statIconLike" />}
                valueStyle={{ fontSize: '24px', color: '#1a1a1a', fontWeight: '700' }}
              />
              <Statistic
                title="评论"
                value={artwork.commentsCount || 0}
                prefix={<LucideIcon icon={MessageCircle} className="artwork-detail-statIcon" />}
                valueStyle={{ fontSize: '24px', color: '#1a1a1a', fontWeight: '700' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <Avatar 
                  src={artwork.author?.avatar} 
                  icon={<LucideIcon icon={User} />}
                  style={{ marginRight: '12px' }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{artwork.author?.nickname || artwork.author?.username}</div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      {formatDate(artwork.createdAt)}
                    </div>
                </div>
              </div>
            </div>

            <div className="artwork-detail-actions">
              <Button
                type={isLiked ? 'primary' : 'default'}
                icon={
                  isLiked ? (
                    <LucideIcon icon={Heart} fill="currentColor" />
                  ) : (
                    <LucideIcon icon={Heart} />
                  )
                }
                onClick={handleLike}
                size="large"
                disabled={!canInteract}
                className={isLiked ? "artwork-detail-likeBtn artwork-detail-likeBtnOn" : "artwork-detail-likeBtn"}
              >
                {isLiked ? '已点赞' : '点赞'}
              </Button>

              {isOwner && (
                <Popconfirm
                  title="确定要删除这个作品吗？"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    danger 
                    icon={<LucideIcon icon={Trash2} />} 
                    size="large"
                    className="artwork-detail-deleteBtn"
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </div>
          </Card>

          {isOwner && stats && (
            <Card 
              title={<><LucideIcon icon={BarChart3} /> 统计数据</>}
              style={{ 
                borderRadius: '20px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e8e8e8'
              }}
            >
              <Tabs 
                defaultActiveKey="total"
                items={[
                  {
                    key: 'total',
                    label: '总计',
                    children: (
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic title="浏览" value={stats.total.views} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="点赞" value={stats.total.likes} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="评论" value={stats.total.comments} />
                        </Col>
                      </Row>
                    )
                  },
                  {
                    key: '7d',
                    label: '近7天',
                    children: (
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic title="浏览" value={stats.last7Days.views} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="点赞" value={stats.last7Days.likes} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="评论" value={stats.last7Days.comments} />
                        </Col>
                      </Row>
                    )
                  },
                  {
                    key: '30d',
                    label: '近30天',
                    children: (
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic title="浏览" value={stats.last30Days.views} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="点赞" value={stats.last30Days.likes} />
                        </Col>
                        <Col span={8}>
                          <Statistic title="评论" value={stats.last30Days.comments} />
                        </Col>
                      </Row>
                    )
                  }
                ]}
              />
            </Card>
          )}
        </Col>
      </Row>

      <Card 
        title={<><LucideIcon icon={MessageCircle} /> 评论 ({artwork.commentsCount || 0})</>}
        className="artwork-detail-commentsCard"
      >
        {/* 登录用户可评论；mock 作品只读 */}
        {canInteract && (
          <div className="artwork-detail-commentComposer">
            <TextArea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              rows={4}
              className="artwork-detail-commentInput"
            />
            <Button 
              type="primary" 
              onClick={handleComment}
              className="artwork-detail-commentBtn"
            >
              发表评论
            </Button>
          </div>
        )}

        <List
          dataSource={comments}
          loading={commentLoading}
          locale={{ emptyText: '暂无评论' }}
          renderItem={(comment) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={comment.user?.avatar} icon={<LucideIcon icon={User} />} />}
                title={
                  <div>
                    <span style={{ fontWeight: 500 }}>{comment.user?.nickname || comment.user?.username}</span>
                    <span style={{ marginLeft: '12px', fontSize: '12px', color: '#8c8c8c' }}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                }
                description={comment.content}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default ArtworkDetail;

