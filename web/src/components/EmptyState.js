import React from 'react';
import { Empty } from 'antd';

/**
 * 空状态组件
 * 用于展示空列表、无搜索结果等场景
 */
const EmptyState = ({ 
  description = '暂无数据', 
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  icon,
  action,
  style = {}
}) => {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      ...style
    }}>
      <Empty
        image={image}
        imageStyle={{
          height: 120,
          opacity: 0.6
        }}
        description={
          <div>
            {icon && (
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.5
              }}>
                {icon}
              </div>
            )}
            <span style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-base)'
            }}>
              {description}
            </span>
          </div>
        }
      >
        {action && (
          <div style={{ marginTop: '24px' }}>
            {action}
          </div>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;

