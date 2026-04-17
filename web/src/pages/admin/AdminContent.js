import React from 'react';
import { Card, List, Typography } from 'antd';

const { Paragraph } = Typography;

const todoList = [
  '作品审核列表（草稿/发布/隐藏）',
  '商品审核与上下架',
  '新闻发布与推荐位配置',
  '评论举报处理',
];

const AdminContent = () => {
  return (
    <Card title="内容管理（占位框架）">
      <Paragraph>
        这是后台管理系统第一版骨架页面，已完成路由与权限保护，便于后续逐步补齐业务能力。
      </Paragraph>
      <List
        bordered
        dataSource={todoList}
        renderItem={(item) => <List.Item>{item}</List.Item>}
      />
    </Card>
  );
};

export default AdminContent;
