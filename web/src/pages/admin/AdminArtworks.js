import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Image,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import adminApi from '../../utils/adminApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { Search } = Input;

const categoryOptions = ['剪纸', '刺绣', '泥塑', '其他'];

const statusColorMap = {
  published: 'green',
  draft: 'gold',
  hidden: 'volcano',
};

const statusTextMap = {
  published: '已发布',
  draft: '草稿',
  hidden: '已隐藏',
};

const AdminArtworks = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    keyword: '',
    status: undefined,
    category: undefined,
  });

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) => {
    setLoading(true);
    try {
      const result = await adminApi.getArtworks({
        page,
        limit: pageSize,
        ...nextFilters,
      });
      const artworks = result?.data?.artworks || [];
      const pageInfo = result?.data?.pagination || {};
      setDataSource(artworks);
      setPagination({
        current: pageInfo.page || page,
        pageSize: pageInfo.limit || pageSize,
        total: pageInfo.total || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '获取作品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, 10, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuery = () => {
    fetchList(1, pagination.pageSize, filters);
  };

  const handleReset = () => {
    const next = {
      keyword: '',
      status: undefined,
      category: undefined,
    };
    setFilters(next);
    fetchList(1, pagination.pageSize, next);
  };

  const handleUpdateStatus = async (item, status) => {
    try {
      await adminApi.updateArtworkStatus(item.id, status);
      message.success('作品状态更新成功');
      fetchList();
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '更新状态失败');
    }
  };

  const handleDelete = async (item) => {
    try {
      await adminApi.deleteArtwork(item.id);
      message.success('作品删除成功');
      const isLastItemOnPage = dataSource.length === 1 && pagination.current > 1;
      const nextPage = isLastItemOnPage ? pagination.current - 1 : pagination.current;
      fetchList(nextPage, pagination.pageSize, filters);
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '删除作品失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '作品图',
      dataIndex: 'imageUrl',
      width: 90,
      render: (value) => (
        value ? <Image src={value} width={52} height={52} style={{ objectFit: 'cover', borderRadius: 6 }} /> : '-'
      ),
    },
    {
      title: '作品标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (value, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value || '-'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            作者：{record?.author?.username || record?.author?.email || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      render: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) => (
        <Tag color={statusColorMap[value] || 'default'}>
          {statusTextMap[value] || value || '-'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space size="small" wrap>
          {record.status !== 'published' ? (
            <Button type="link" onClick={() => handleUpdateStatus(record, 'published')}>
              发布
            </Button>
          ) : null}
          {record.status !== 'hidden' ? (
            <Button type="link" onClick={() => handleUpdateStatus(record, 'hidden')}>
              隐藏
            </Button>
          ) : null}
          {record.status !== 'draft' ? (
            <Button type="link" onClick={() => handleUpdateStatus(record, 'draft')}>
              设为草稿
            </Button>
          ) : null}
          <Popconfirm
            title="确认删除该作品吗？"
            description={record.title || '未命名作品'}
            okText="删除"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="作品管理"
        description="审核、状态流转与内容安全的核心入口"
      />

      <Card>
        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
          <Col xs={24} md={10} lg={8}>
            <Search
              allowClear
              placeholder="搜索标题/描述"
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              onSearch={handleQuery}
            />
          </Col>
          <Col xs={12} md={7} lg={5}>
            <Select
              allowClear
              placeholder="状态"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value || undefined }))}
              options={[
                { value: 'published', label: '已发布' },
                { value: 'draft', label: '草稿' },
                { value: 'hidden', label: '已隐藏' },
              ]}
            />
          </Col>
          <Col xs={12} md={7} lg={5}>
            <Select
              allowClear
              placeholder="分类"
              style={{ width: '100%' }}
              value={filters.category}
              onChange={(value) => setFilters((prev) => ({ ...prev, category: value || undefined }))}
              options={categoryOptions.map((item) => ({ value: item, label: item }))}
            />
          </Col>
          <Col xs={24} lg={6}>
            <Space wrap>
              <Button type="primary" onClick={handleQuery}>查询</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={dataSource}
          pagination={pagination}
          onChange={(pager) => fetchList(pager.current, pager.pageSize, filters)}
        />
      </Card>
    </div>
  );
};

export default AdminArtworks;
