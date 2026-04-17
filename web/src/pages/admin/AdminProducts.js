import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import adminApi from '../../utils/adminApi';

const categoryOptions = ['T恤', '手机壳', '帆布袋', '明信片', '其他'];

const statusColorMap = {
  published: 'green',
  draft: 'gold',
  sold_out: 'volcano',
};

const violationColorMap = {
  normal: 'green',
  suspected: 'orange',
  confirmed: 'red',
};

const reviewColorMap = {
  pending: 'default',
  approved: 'green',
  rejected: 'red',
  reopened: 'blue',
};

const AdminProducts = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    keyword: '',
    status: undefined,
    category: undefined,
    violationStatus: undefined,
    reviewStatus: undefined,
  });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm] = Form.useForm();

  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [offlineTarget, setOfflineTarget] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approve');
  const [reviewReason, setReviewReason] = useState('');

  const [batchStock, setBatchStock] = useState(null);
  const [batchPrice, setBatchPrice] = useState(null);
  const [viewMode, setViewMode] = useState('grouped');

  const getArtworkImage = (record) => {
    if (record?.pattern?.imageUrl) return record.pattern.imageUrl;
    if (Array.isArray(record?.images) && record.images.length > 0) return record.images[0];
    return '';
  };

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const result = await adminApi.getProducts({
        page,
        limit: pageSize,
        ...filters,
      });
      const products = result?.data?.products || [];
      const pageInfo = result?.data?.pagination || {};
      setDataSource(products);
      setPagination({
        current: pageInfo.page || page,
        pageSize: pageInfo.limit || pageSize,
        total: pageInfo.total || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAndFetch = () => {
    setSelectedRowKeys([]);
    fetchList(1, pagination.pageSize);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    editForm.setFieldsValue({
      name: item.name,
      description: item.description,
      category: item.category,
      price: Number(item.price),
      originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      stock: Number(item.stock || 0),
      status: item.status,
      material: item.material || '',
      size: item.size || '',
      origin: item.origin || '',
      craftsmanship: item.craftsmanship || '',
      culturalMeaning: item.culturalMeaning || '',
      imagesText: Array.isArray(item.images) ? item.images.join('\n') : '',
    });
    setEditModalOpen(true);
  };

  const submitEdit = async () => {
    if (!editingItem) return;
    try {
      const values = await editForm.validateFields();
      const payload = {
        ...values,
        images: (values.imagesText || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };
      delete payload.imagesText;
      await adminApi.updateProduct(editingItem.id, payload);
      message.success('商品更新成功');
      setEditModalOpen(false);
      setEditingItem(null);
      fetchList();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || error.message || '更新商品失败');
    }
  };

  const doBatchAction = async (action, payload = {}) => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择商品');
      return;
    }
    try {
      await adminApi.batchUpdateProducts({
        ids: selectedRowKeys,
        action,
        payload,
      });
      message.success('批量操作成功');
      setSelectedRowKeys([]);
      fetchList();
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '批量操作失败');
    }
  };

  const openOfflineModal = (item) => {
    setOfflineTarget(item);
    setOfflineReason('');
    setOfflineModalOpen(true);
  };

  const submitOffline = async () => {
    if (!offlineTarget) return;
    try {
      await adminApi.offlineProduct(offlineTarget.id, offlineReason || '违反平台规范，已下架');
      message.success('已违规下架');
      setOfflineModalOpen(false);
      setOfflineTarget(null);
      fetchList();
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '违规下架失败');
    }
  };

  const openReviewModal = (item, decision) => {
    setReviewTarget(item);
    setReviewDecision(decision);
    setReviewReason('');
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    try {
      await adminApi.reviewProduct(reviewTarget.id, reviewDecision, reviewReason || '管理员复审');
      message.success('复审操作成功');
      setReviewModalOpen(false);
      setReviewTarget(null);
      fetchList();
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '复审失败');
    }
  };

  const handleDelete = async (item) => {
    try {
      await adminApi.deleteProduct(item.id);
      message.success('商品已删除');
      fetchList();
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '删除商品失败');
    }
  };

  const groupedByCreator = dataSource.reduce((acc, item) => {
    const key = item?.creator?.username || '未知制作人';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 80,
      },
      {
        title: '作品图片',
        key: 'artworkImage',
        width: 100,
        render: (_, record) => {
          const image = getArtworkImage(record);
          return image ? (
            <img
              src={image}
              alt={record.name}
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span style={{ color: '#999' }}>无图</span>
          );
        },
      },
      {
        title: '商品',
        dataIndex: 'name',
        render: (value, record) => (
          <div>
            <div style={{ fontWeight: 600 }}>{value}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>创建者：{record.creator?.username || '-'}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>作品：{record.pattern?.title || '-'}</div>
          </div>
        ),
      },
      {
        title: '价格',
        dataIndex: 'price',
        width: 120,
        render: (value) => `¥${Number(value || 0).toFixed(2)}`,
      },
      {
        title: '库存',
        dataIndex: 'stock',
        width: 90,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (value) => <Tag color={statusColorMap[value] || 'default'}>{value}</Tag>,
      },
      {
        title: '违规',
        dataIndex: 'violationStatus',
        width: 110,
        render: (value) => <Tag color={violationColorMap[value] || 'default'}>{value || 'normal'}</Tag>,
      },
      {
        title: '复审',
        dataIndex: 'reviewStatus',
        width: 110,
        render: (value) => <Tag color={reviewColorMap[value] || 'default'}>{value || 'pending'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 320,
        render: (_, record) => (
          <Space wrap>
            <Button size="small" onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Button size="small" danger onClick={() => openOfflineModal(record)}>
              违规下架
            </Button>
            <Button size="small" type="primary" onClick={() => openReviewModal(record, 'approve')}>
              复审通过
            </Button>
            <Button size="small" onClick={() => openReviewModal(record, 'reject')}>
              驳回
            </Button>
            <Button size="small" onClick={() => openReviewModal(record, 'reopen')}>
              重开
            </Button>
            <Popconfirm
              title="确认删除该商品吗？"
              description="删除后前台用户将无法看到此商品"
              onConfirm={() => handleDelete(record)}
              okText="删除"
              cancelText="取消"
            >
              <Button size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

  return (
    <Card title="商品管理（P0）">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value)}
          options={[
            { label: '按制作人分组', value: 'grouped' },
            { label: '普通列表', value: 'table' },
          ]}
        />

        <Space wrap>
          <Input
            style={{ width: 220 }}
            placeholder="搜索商品名/描述"
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={() => resetAndFetch()}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            options={[
              { value: 'published', label: 'published' },
              { value: 'draft', label: 'draft' },
              { value: 'sold_out', label: 'sold_out' },
            ]}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="分类"
            value={filters.category}
            onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
            options={categoryOptions.map((c) => ({ value: c, label: c }))}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder="违规状态"
            value={filters.violationStatus}
            onChange={(value) => setFilters((prev) => ({ ...prev, violationStatus: value }))}
            options={[
              { value: 'normal', label: 'normal' },
              { value: 'suspected', label: 'suspected' },
              { value: 'confirmed', label: 'confirmed' },
            ]}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder="复审状态"
            value={filters.reviewStatus}
            onChange={(value) => setFilters((prev) => ({ ...prev, reviewStatus: value }))}
            options={[
              { value: 'pending', label: 'pending' },
              { value: 'approved', label: 'approved' },
              { value: 'rejected', label: 'rejected' },
              { value: 'reopened', label: 'reopened' },
            ]}
          />
          <Button type="primary" onClick={() => resetAndFetch()}>
            查询
          </Button>
          <Button onClick={() => {
            setFilters({ keyword: '', status: undefined, category: undefined, violationStatus: undefined, reviewStatus: undefined });
            setTimeout(() => fetchList(1, pagination.pageSize), 0);
          }}>
            重置
          </Button>
        </Space>

        <Space wrap>
          <Button onClick={() => doBatchAction('setStatus', { status: 'published' })}>批量上架</Button>
          <Button onClick={() => doBatchAction('setStatus', { status: 'draft' })}>批量下架</Button>
          <InputNumber
            placeholder="库存"
            value={batchStock}
            onChange={(val) => setBatchStock(val)}
          />
          <Button onClick={() => doBatchAction('setStock', { stock: Number(batchStock) })}>批量设库存</Button>
          <InputNumber
            placeholder="价格"
            value={batchPrice}
            onChange={(val) => setBatchPrice(val)}
          />
          <Button onClick={() => doBatchAction('setPrice', { price: Number(batchPrice) })}>批量设价格</Button>
        </Space>

        {viewMode === 'grouped' ? (
          <Collapse
            items={Object.keys(groupedByCreator).map((creatorName) => ({
              key: creatorName,
              label: `${creatorName}（${groupedByCreator[creatorName].length}）`,
              children: (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={groupedByCreator[creatorName]}
                  pagination={false}
                  size="small"
                />
              ),
            }))}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page, pageSize) => fetchList(page, pageSize),
            }}
          />
        )}
      </Space>

      <Modal
        title="编辑商品"
        open={editModalOpen}
        onOk={submitEdit}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingItem(null);
          editForm.resetFields();
        }}
        width={760}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="商品名称" name="name" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="商品描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]} style={{ minWidth: 140 }}>
              <Select options={categoryOptions.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="价格" name="price" rules={[{ required: true, message: '请输入价格' }]}>
              <InputNumber min={0.01} precision={2} />
            </Form.Item>
            <Form.Item label="原价" name="originalPrice">
              <InputNumber min={0} precision={2} />
            </Form.Item>
            <Form.Item label="库存" name="stock" rules={[{ required: true, message: '请输入库存' }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]} style={{ minWidth: 120 }}>
              <Select
                options={[
                  { value: 'published', label: 'published' },
                  { value: 'draft', label: 'draft' },
                  { value: 'sold_out', label: 'sold_out' },
                ]}
              />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item label="材质" name="material" style={{ minWidth: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item label="尺寸" name="size" style={{ minWidth: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item label="产地" name="origin" style={{ minWidth: 180 }}>
              <Input />
            </Form.Item>
          </Space>

          <Form.Item label="工艺传承" name="craftsmanship">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="文化寓意" name="culturalMeaning">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="商品图URL（每行一条）" name="imagesText">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="违规下架"
        open={offlineModalOpen}
        onOk={submitOffline}
        onCancel={() => {
          setOfflineModalOpen(false);
          setOfflineTarget(null);
          setOfflineReason('');
        }}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入下架原因"
          value={offlineReason}
          onChange={(e) => setOfflineReason(e.target.value)}
        />
      </Modal>

      <Modal
        title="复审处理"
        open={reviewModalOpen}
        onOk={submitReview}
        onCancel={() => {
          setReviewModalOpen(false);
          setReviewTarget(null);
          setReviewReason('');
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={reviewDecision}
            onChange={setReviewDecision}
            options={[
              { value: 'approve', label: '通过' },
              { value: 'reject', label: '驳回' },
              { value: 'reopen', label: '重开' },
            ]}
          />
          <Input.TextArea
            rows={4}
            placeholder="请输入复审备注"
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
          />
        </Space>
      </Modal>
    </Card>
  );
};

export default AdminProducts;
