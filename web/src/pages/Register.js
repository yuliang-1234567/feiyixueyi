import React, { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { Lock, Mail, User } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LucideIcon } from "../components/icons/lucide";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致！');
      return;
    }

    setLoading(true);
    const result = await register(values.username, values.email, values.password);
    setLoading(false);

    if (result.success) {
      message.success('注册成功！');
      navigate('/');
    } else {
      message.error(result.message || '注册失败');
    }
  };

  return (
    <div className="page-container">
      <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>注册</h2>
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名!' },
              { min: 3, message: '用户名至少3个字符!' },
            ]}
          >
            <Input prefix={<LucideIcon icon={User} />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱!' },
              { type: 'email', message: '请输入有效的邮箱地址!' },
            ]}
          >
            <Input prefix={<LucideIcon icon={Mail} />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码至少6个字符!' },
            ]}
          >
            <Input.Password prefix={<LucideIcon icon={Lock} />} placeholder="密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: '请确认密码!' }]}
          >
            <Input.Password prefix={<LucideIcon icon={Lock} />} placeholder="确认密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <a href="/login">已有账号？立即登录</a>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

