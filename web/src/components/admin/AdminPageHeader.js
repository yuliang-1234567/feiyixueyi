import React from 'react';
import { Breadcrumb, Space, Typography } from 'antd';

const { Title, Text } = Typography;

export default function AdminPageHeader({ title, description, breadcrumbItems, extra }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {Array.isArray(breadcrumbItems) && breadcrumbItems.length ? (
        <Breadcrumb style={{ marginBottom: 6 }} items={breadcrumbItems} />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Space direction="vertical" size={2}>
          <Title level={4} style={{ margin: 0, letterSpacing: '0.02em' }}>
            {title}
          </Title>
          {description ? (
            <Text type="secondary">{description}</Text>
          ) : null}
        </Space>
        {extra ? <div>{extra}</div> : null}
      </div>
    </div>
  );
}

