import React, { useEffect, useState } from 'react';
import { Card, Image, Input, Segmented, Space, Table, Tag, message } from 'antd';
import adminApi from '../../utils/adminApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { Search } = Input;

const questionTypeMap = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
};

const difficultyColorMap = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

const AdminFavorites = () => {
  const [mode, setMode] = useState('quiz');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize, currentMode = mode, currentKeyword = keyword) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        keyword: currentKeyword || undefined,
      };
      const result = currentMode === 'quiz'
        ? await adminApi.getQuizFavorites(params)
        : await adminApi.getArtworkFavorites(params);

      const list = result?.data?.list || [];
      const pageInfo = result?.data?.pagination || {};
      setDataSource(list);
      setPagination({
        current: pageInfo.page || page,
        pageSize: pageInfo.limit || pageSize,
        total: pageInfo.total || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '加载收藏列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, 10, mode, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const quizColumns = [
    {
      title: '收藏ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: '收藏用户',
      key: 'user',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.user?.username || '-'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.user?.email || '-'}</div>
        </div>
      ),
    },
    {
      title: '题目',
      key: 'question',
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 6 }}>{record.question?.stem || '-'}</div>
          <Space size={6} wrap>
            <Tag color="blue">{record.question?.categoryName || '-'}</Tag>
            <Tag color="purple">{questionTypeMap[record.question?.questionType] || record.question?.questionType || '-'}</Tag>
            <Tag color={difficultyColorMap[record.question?.difficulty] || 'default'}>{record.question?.difficulty || '-'}</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: '收藏时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
  ];

  const artworkColumns = [
    {
      title: '收藏ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: '收藏用户',
      key: 'user',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.user?.username || '-'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.user?.email || '-'}</div>
        </div>
      ),
    },
    {
      title: '作品',
      key: 'artwork',
      render: (_, record) => (
        <Space align="start">
          {record.artwork?.imageUrl ? (
            <Image src={record.artwork.imageUrl} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
          ) : null}
          <div>
            <div style={{ fontWeight: 600 }}>{record.artwork?.title || '-'}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              作者：{record.artwork?.author?.username || record.artwork?.author?.email || '-'}
            </div>
            <Space size={6} style={{ marginTop: 4 }}>
              <Tag color="cyan">{record.artwork?.category || '-'}</Tag>
              <Tag>{record.artwork?.status || '-'}</Tag>
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: '收藏时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="收藏管理"
        description="题目收藏与作品收藏统一查看"
      />

      <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Segmented
          value={mode}
          onChange={(val) => {
            setMode(val);
            setDataSource([]);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
          options={[
            { label: '题目收藏', value: 'quiz' },
            { label: '作品收藏（含小程序）', value: 'artwork' },
          ]}
        />
        <Search
          allowClear
          placeholder={mode === 'quiz' ? '搜索题干' : '搜索作品标题'}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={() => fetchList(1, pagination.pageSize, mode, keyword)}
          style={{ width: 280 }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={dataSource}
        columns={mode === 'quiz' ? quizColumns : artworkColumns}
        pagination={pagination}
        onChange={(pager) => fetchList(pager.current, pager.pageSize, mode, keyword)}
      />
      </Card>
    </div>
  );
};

export default AdminFavorites;
