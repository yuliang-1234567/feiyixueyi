import React, { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  InputNumber,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Button,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FallOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import adminApi from '../../utils/adminApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { Text } = Typography;

const AdminAiMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState(null);

  const loadData = async (d = days) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.getAiMonitorOverview({ days: d });
      setOverview(result?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '获取AI调用监控失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(7);
  }, []);

  const summary = overview?.summary || {};
  const modelStats = overview?.modelStats || [];
  const failureReasonTop = overview?.failureReasonTop || [];
  const recentLogs = overview?.recentLogs || [];

  const modelColumns = [
    {
      title: '模型/通道',
      dataIndex: 'name',
      key: 'name',
      render: (value) => value || '-',
    },
    {
      title: '调用量',
      dataIndex: 'calls',
      key: 'calls',
      width: 100,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 110,
      render: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      title: '平均耗时(ms)',
      dataIndex: 'avgLatencyMs',
      key: 'avgLatencyMs',
      width: 130,
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: '成本(元)',
      dataIndex: 'costCny',
      key: 'costCny',
      width: 120,
      render: (value) => Number(value || 0).toFixed(6),
    },
  ];

  const failureColumns = [
    {
      title: '失败原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (value) => value || 'unknown',
    },
    {
      title: '次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
    },
  ];

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '功能',
      dataIndex: 'feature',
      key: 'feature',
      width: 140,
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 160,
      render: (value) => value || '-',
    },
    {
      title: '通道',
      dataIndex: 'provider',
      key: 'provider',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (value) => value ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      width: 110,
    },
    {
      title: '降级',
      dataIndex: 'downgraded',
      key: 'downgraded',
      width: 90,
      render: (value) => value ? <Tag color="orange">命中</Tag> : <Tag>否</Tag>,
    },
    {
      title: '成本(元)',
      dataIndex: 'costCny',
      key: 'costCny',
      width: 110,
      render: (value) => Number(value || 0).toFixed(6),
    },
    {
      title: '失败原因',
      dataIndex: 'errorReason',
      key: 'errorReason',
      render: (value) => value || '-',
    },
  ];

  if (loading) {
    return (
      <Card><Spin /></Card>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="AI 调用监控"
        description="调用量、成功率、时延与成本的快速巡检"
      />

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card style={{ marginBottom: 12 }}>
        <Space wrap>
          <Text>统计范围（天）</Text>
          <InputNumber min={1} max={60} value={days} onChange={(v) => setDays(v || 7)} />
          <Button type="primary" onClick={() => loadData(days)}>刷新</Button>
          <Text type="secondary">近 {overview?.range?.days || days} 天</Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="模型调用量" value={summary.totalCalls || 0} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="成功率" value={Number(summary.successRate || 0)} precision={2} suffix="%" prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="平均耗时" value={Number(summary.avgLatencyMs || 0)} precision={2} suffix="ms" prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="成本统计" value={Number(summary.totalCostCny || 0)} precision={6} suffix="元" prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="降级命中率" value={Number(summary.downgradeHitRate || 0)} precision={2} suffix="%" prefix={<FallOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic title="失败调用量" value={summary.failureCalls || 0} prefix={<WarningOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={14}>
          <Card title="模型表现（Top 10）">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              columns={modelColumns}
              dataSource={modelStats}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="失败原因 Top">
            <Table
              rowKey="reason"
              size="small"
              pagination={false}
              columns={failureColumns}
              dataSource={failureReasonTop}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 8 }}>
        <Col span={24}>
          <Card title="最近调用日志（最多50条）">
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
              columns={logColumns}
              dataSource={recentLogs}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminAiMonitor;
