import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import adminApi from '../../utils/adminApi';

const { RangePicker } = DatePicker;

const statusOptions = [
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const statusColorMap = {
  pending: 'gold',
  paid: 'blue',
  shipped: 'cyan',
  completed: 'green',
  cancelled: 'default',
};

const statusLabelMap = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

const AdminOrders = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    orderId: undefined,
    status: undefined,
    userId: undefined,
    dateRange: null,
  });

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [noteForm] = Form.useForm();

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };

      if (filters.orderId) params.id = filters.orderId;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;
      if (Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].startOf('day').toISOString();
        params.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      const result = await adminApi.getOrders(params);
      const orders = result?.data?.orders || [];
      const pageInfo = result?.data?.pagination || {};
      setDataSource(orders);
      setPagination({
        current: pageInfo.page || page,
        pageSize: pageInfo.limit || pageSize,
        total: pageInfo.total || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    fetchList(1, pagination.pageSize);
  };

  const onReset = () => {
    setFilters({
      orderId: undefined,
      status: undefined,
      userId: undefined,
      dateRange: null,
    });
    setTimeout(() => fetchList(1, pagination.pageSize), 0);
  };

  const handleStatusChange = async (record, nextStatus) => {
    try {
      await adminApi.updateOrderStatus(record.id, nextStatus);
      message.success('订单状态更新成功');
      fetchList(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || '更新订单状态失败');
    }
  };

  const openNoteModal = (record) => {
    setCurrentOrder(record);
    noteForm.setFieldsValue({
      refundNote: record?.serviceNotes?.refundNote || '',
      afterSaleNote: record?.serviceNotes?.afterSaleNote || '',
    });
    setNoteModalOpen(true);
  };

  const saveNotes = async () => {
    if (!currentOrder) return;
    try {
      const values = await noteForm.validateFields();
      setNoteSaving(true);
      await adminApi.updateOrderNotes(currentOrder.id, {
        refundNote: values.refundNote || '',
        afterSaleNote: values.afterSaleNote || '',
      });
      message.success('备注保存成功');
      setNoteModalOpen(false);
      setCurrentOrder(null);
      fetchList(pagination.current, pagination.pageSize);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || error.message || '保存备注失败');
    } finally {
      setNoteSaving(false);
    }
  };

  const columns = useMemo(() => [
    {
      title: '订单ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record?.user?.username || '-'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record?.user?.email || '-'}</div>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (value) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      render: (value, record) => (
        <Space direction="vertical" size={6}>
          <Tag color={statusColorMap[value] || 'default'}>{statusLabelMap[value] || value}</Tag>
          <Select
            size="small"
            value={value}
            style={{ width: 110 }}
            options={statusOptions}
            onChange={(next) => handleStatusChange(record, next)}
          />
        </Space>
      ),
    },
    {
      title: '收货信息',
      key: 'shipping',
      render: (_, record) => (
        <div>
          <div>{record?.shippingName || '-'} / {record?.shippingPhone || '-'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            {[record?.shippingProvince, record?.shippingCity, record?.shippingAddress]
              .filter(Boolean)
              .join(' ')
              || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '退款/售后备注',
      key: 'notes',
      width: 260,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
            退款：{record?.serviceNotes?.refundNote || '暂无'}
          </div>
          <div style={{ fontSize: 12, color: '#595959' }}>
            售后：{record?.serviceNotes?.afterSaleNote || '暂无'}
          </div>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => openNoteModal(record)}>
          编辑备注
        </Button>
      ),
    },
  ], []);

  return (
    <Card title="订单管理（P0）">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <InputNumber
            min={1}
            style={{ width: 160 }}
            placeholder="订单ID"
            value={filters.orderId}
            onChange={(value) => setFilters((prev) => ({ ...prev, orderId: value || undefined }))}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="订单状态"
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            options={statusOptions}
          />
          <InputNumber
            min={1}
            style={{ width: 140 }}
            placeholder="用户ID"
            value={filters.userId}
            onChange={(value) => setFilters((prev) => ({ ...prev, userId: value || undefined }))}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters((prev) => ({ ...prev, dateRange: dates }))}
          />
          <Button type="primary" onClick={onSearch}>查询</Button>
          <Button onClick={onReset}>重置</Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={dataSource}
          pagination={pagination}
          scroll={{ x: 1300 }}
          onChange={(pager) => fetchList(pager.current, pager.pageSize)}
        />
      </Space>

      <Modal
        title={currentOrder ? `订单 #${currentOrder.id} 备注` : '订单备注'}
        open={noteModalOpen}
        onCancel={() => {
          if (noteSaving) return;
          setNoteModalOpen(false);
          setCurrentOrder(null);
          noteForm.resetFields();
        }}
        onOk={saveNotes}
        okText="保存"
        cancelText="取消"
        confirmLoading={noteSaving}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item name="refundNote" label="退款备注">
            <Input.TextArea rows={4} placeholder="填写退款处理进度、原因等" maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="afterSaleNote" label="售后备注">
            <Input.TextArea rows={4} placeholder="填写售后沟通、补寄、处理结果等" maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminOrders;
