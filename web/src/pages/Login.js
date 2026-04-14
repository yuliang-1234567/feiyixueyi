import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, message, Checkbox, Typography, Alert } from 'antd';
import { Lock, Palette, User } from "lucide-react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LucideIcon } from "../components/icons/lucide";

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, fetchCurrentUser, user, isAuthenticated } = useAuthStore();
  const fromPath = useMemo(
    () => location.state?.from?.pathname || '/',
    [location.state?.from?.pathname]
  );
  const [remember, setRemember] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auth-remember-me') === '1';
  });
  
  // 检查URL参数中的过期信息
  const [expiredMessage, setExpiredMessage] = useState('');
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      const msg = params.get('message') || '您的登录已过期，请重新登录';
      setExpiredMessage(msg);
      message.warning(msg, 4);
      // 清除URL参数
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 初始化记住的邮箱
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rememberedEmail = localStorage.getItem('auth-remember-email');
    if (rememberedEmail) {
      form.setFieldsValue({ email: rememberedEmail });
      setRemember(true);
    }
  }, [form]);

  // 如果已经登录，自动跳转（防止已登录用户访问登录页）
  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('[Login Page] 用户已登录，自动跳转');
      navigate(fromPath, { replace: true });
    }
  }, [user, isAuthenticated, navigate, fromPath]);

  const onFinish = async (values) => {
    const { email, password, remember: rememberValue } = values;
    let hide = null;

    try {
      setLoading(true);
      hide = message.loading('正在登录...', 0);

      console.log('📝 [Login Page] 开始登录流程...', {
        email,
        rememberValue,
      });

      // 处理记住邮箱
      if (rememberValue) {
        localStorage.setItem('auth-remember-me', '1');
        localStorage.setItem('auth-remember-email', email.trim());
      } else {
        localStorage.removeItem('auth-remember-me');
        localStorage.removeItem('auth-remember-email');
      }

      // 执行登录
      console.log('[Login Page] 调用 login 函数');
      const result = await login(email.trim(), password);
      console.log('[Login Page] 登录结果:', result);

      // 关闭加载提示
      if (hide) {
        hide();
        hide = null;
      }

      if (result && result.success) {
        console.log('[Login Page] 登录成功');

        // 验证用户状态（从store获取最新状态）
        const storeState = useAuthStore.getState();
        console.log('[Login Page] Store状态:', {
          user: storeState.user,
          isAuthenticated: storeState.isAuthenticated,
          hasToken: !!storeState.token,
        });

        // 显示成功消息
        message.success({
          content: `登录成功！欢迎回来，${result.user?.username || '用户'}～`,
          duration: 2,
        });

        // 可选：获取完整的用户信息（如果需要更详细的用户信息）
        try {
          const userResult = await fetchCurrentUser();
          if (userResult.success) {
            console.log('[Login Page] 用户信息已更新:', userResult.user);
          }
        } catch (err) {
          console.warn('[Login Page] 获取用户信息失败（不影响登录）:', err);
          // 即使获取用户信息失败，登录也已经成功，可以继续
        }

        // 稍微延迟跳转，确保消息能够显示，并且状态已更新
        setTimeout(() => {
          const finalState = useAuthStore.getState();
          console.log('[Login Page] 准备跳转，最终状态:', {
            user: finalState.user,
            isAuthenticated: finalState.isAuthenticated,
          });
          console.log('[Login Page] 跳转到:', fromPath);
          navigate(fromPath, { replace: true });
        }, 800);
      } else {
        // 显示错误消息
        const errorMsg = result?.message || '登录失败，请检查账号和密码';
        console.error('[Login Page] 登录失败:', errorMsg);
        message.error(errorMsg, 3);
      }
    } catch (error) {
      console.error('[Login Page] 登录异常:', error);

      // 关闭加载提示
      if (hide) {
        hide();
        hide = null;
      }

      // 显示错误消息
      const errorMsg = error.message || '登录出现异常，请稍后重试';
      message.error(errorMsg, 3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      background: 'transparent'
    }}>
      <Card style={{ 
        maxWidth: '450px', 
        width: '100%',
        margin: '0 auto',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Typography.Title level={2} style={{ 
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2.5rem',
            fontWeight: 700
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <LucideIcon icon={Palette} />
              欢迎回来
            </span>
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '15px', marginTop: '8px', display: 'block' }}>
            登录您的账号以继续
          </Typography.Text>
        </div>
        
        {expiredMessage && (
          <Alert
            message="登录已过期"
            description={expiredMessage}
            type="warning"
            showIcon
            closable
            onClose={() => setExpiredMessage('')}
            style={{ marginBottom: '24px' }}
          />
        )}
        
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          initialValues={{ remember }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱!' },
              { type: 'email', message: '请输入有效的邮箱地址!' },
            ]}
          >
            <Input prefix={<LucideIcon icon={User} />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码至少需要 6 个字符' },
            ]}
          >
            <Input.Password prefix={<LucideIcon icon={Lock} />} placeholder="密码" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox onChange={(e) => setRemember(e.target.checked)}>
              记住我的邮箱
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{
                height: '48px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              登录
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Typography.Text type="secondary">
              还没有账号？ <Link to="/register">立即注册</Link>
            </Typography.Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;

