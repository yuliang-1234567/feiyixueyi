import React, { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  TeamOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import adminApi from '../../utils/adminApi';
import EChart, { buildBarOption, buildFunnelOption, buildLineOption } from '../../components/charts/EChart';

const { Paragraph, Text } = Typography;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await adminApi.getDashboardP1();
        setDashboard(result?.data || null);
      } catch (e) {
        setError(e.response?.data?.message || e.message || '获取数据看板失败');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const today = dashboard?.today || {};
  const hotArtworks = dashboard?.hot?.artworks || [];
  const hotProducts = dashboard?.hot?.products || [];
  const topActiveHours = dashboard?.activeHours?.top || [];
  const trendDays = dashboard?.trend?.days || [];
  const funnel = dashboard?.funnel?.steps || {};
  const funnelConv = dashboard?.funnel?.conversion || {};

  const artworkColumns = [
    {
      title: '作品',
      dataIndex: 'title',
      key: 'title',
      render: (value) => value || '-',
    },
    {
      title: '浏览',
      dataIndex: 'views',
      key: 'views',
      width: 100,
    },
    {
      title: '点赞',
      dataIndex: 'likesCount',
      key: 'likesCount',
      width: 100,
    },
  ];

  const productColumns = [
    {
      title: '商品',
      dataIndex: 'name',
      key: 'name',
      render: (value) => value || '-',
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales',
      width: 100,
    },
    {
      title: '浏览',
      dataIndex: 'views',
      key: 'views',
      width: 100,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (value) => `¥${Number(value || 0).toFixed(2)}`,
    },
  ];

  const funnelRows = [
    { key: 'browse', name: '浏览', value: Number(funnel?.browse || 0) },
    { key: 'cart', name: '加购', value: Number(funnel?.addToCart || 0) },
    { key: 'order', name: '下单', value: Number(funnel?.placeOrder || 0) },
    { key: 'pay', name: '支付', value: Number(funnel?.pay || 0) },
  ];

  const activeHourLabels = (topActiveHours || []).map((item) => String(item?.hour || '-'));
  const activeHourSeries = [
    {
      name: '活跃度',
      data: (topActiveHours || []).map((item) => Number(item?.activity || 0)),
    },
  ];

  const funnelChartData = funnelRows.map((row) => ({ name: row.name, value: row.value }));

  const trendLabels = (trendDays || []).map((d) => String(d?.date || '-').slice(5));
  const trendOptionFactory = buildLineOption({
    title: undefined,
    xAxis: trendLabels,
    series: [
      { name: '新增用户', data: (trendDays || []).map((d) => Number(d?.newUsers || 0)) },
      { name: '新增订单', data: (trendDays || []).map((d) => Number(d?.newOrders || 0)) },
    ],
  });

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <div>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日新增用户"
              value={today?.newUsers || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日新增订单"
              value={today?.newOrders || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日成交额"
              value={Number(today?.revenue || 0)}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日转化率"
              value={Number(today?.conversionRate || 0)}
              precision={2}
              suffix="%"
              prefix={<PercentageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={24}>
          <Card title="趋势（近7天）">
            {trendDays.length ? (
              <EChart height={280} ariaLabel="近7天趋势折线图" optionFactory={trendOptionFactory} />
            ) : (
              <Text type="secondary">暂无趋势数据</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="热门作品">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={artworkColumns}
              dataSource={hotArtworks}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="热销商品">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={productColumns}
              dataSource={hotProducts}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <Card title="活跃时段（近7天）">
            {topActiveHours.length ? (
              <EChart
                height={280}
                ariaLabel="活跃时段柱状图"
                optionFactory={buildBarOption({
                  title: undefined,
                  xAxis: activeHourLabels,
                  series: activeHourSeries,
                })}
              />
            ) : (
              <Text type="secondary">暂无活跃时段数据</Text>
            )}
            {topActiveHours.length ? (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">提示：柱越高表示该时段综合活跃度越高。</Text>
              </div>
            ) : null}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="漏斗分析（浏览→加购→下单→支付）">
            <EChart
              height={280}
              ariaLabel="漏斗图"
              optionFactory={buildFunnelOption({
                title: undefined,
                data: funnelChartData,
              })}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">浏览到加购 {Number(funnelConv?.browseToCart || 0)}%</Tag>
              <Tag color="purple">加购到下单 {Number(funnelConv?.cartToOrder || 0)}%</Tag>
              <Tag color="green">下单到支付 {Number(funnelConv?.orderToPay || 0)}%</Tag>
            </div>
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              当前系统未单独持久化购物车行为，“加购”使用 pending 状态订单数作为代理指标。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
