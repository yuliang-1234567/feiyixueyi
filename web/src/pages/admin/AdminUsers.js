import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import adminApi from '../../utils/adminApi';

const roleColors = {
  admin: 'red',
  artist: 'blue',
  user: 'green',
};

const AdminUsers = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.getUsers({ page, limit: pageSize });
      const users = result?.data?.users || [];
      const pageInfo = result?.data?.pagination || {};
      setData(users);
      setPagination({
        current: pageInfo.page || page,
        pageSize: pageInfo.limit || pageSize,
        total: pageInfo.total || 0,
      });
    } catch (e) {
      setError(e.response?.data?.message || e.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, 10);
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await adminApi.createUser({
        username: String(values.username || '').trim(),
        email: String(values.email || '').trim(),
        password: String(values.password || ''),
        role: values.role || 'user',
      });
      message.success('用户创建成功');
      setCreateModalOpen(false);
      form.resetFields();
      loadData(1, pagination.pageSize || 10);
    } catch (e) {
      if (e?.errorFields) {
        return;
      }
      message.error(e.response?.data?.message || e.message || '创建用户失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      setDeletingId(record.id);
      await adminApi.deleteUser(record.id);
      message.success('用户删除成功');
      const isLastItemOnPage = data.length === 1 && pagination.current > 1;
      const nextPage = isLastItemOnPage ? pagination.current - 1 : pagination.current;
      loadData(nextPage, pagination.pageSize || 10);
    } catch (e) {
      message.error(e.response?.data?.message || e.message || '删除用户失败');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      render: (value, record) => value || record.nickname || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role) => <Tag color={roleColors[role] || 'default'}>{role || 'user'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 220,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="确认删除该用户吗？"
          description={`用户：${record.username || record.email}`}
          okText="删除"
          cancelText="取消"
          onConfirm={() => handleDelete(record)}
        >
          <Button
            danger
            type="link"
            loading={deletingId === record.id}
            disabled={deletingId !== null && deletingId !== record.id}
          >
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="用户管理"
      extra={(
        <Space>
          <Button type="primary" onClick={() => setCreateModalOpen(true)}>
            添加用户
          </Button>
        </Space>
      )}
    >
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onChange={(pager) => loadData(pager.current, pager.pageSize)}
      />

      <Modal
        title="添加用户"
        open={createModalOpen}
        onCancel={() => {
          if (creating) return;
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度需为 3-20 位' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能少于 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              options={[
                { value: 'user', label: 'user' },
                { value: 'artist', label: 'artist' },
                { value: 'admin', label: 'admin' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminUsers;
