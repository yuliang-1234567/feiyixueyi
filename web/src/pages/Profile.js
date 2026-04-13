import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Avatar, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const { TextArea } = Input;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserInfo();
  }, [user, navigate]);

  const fetchUserInfo = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUserInfo(response.data.data.user);
      }
    } catch (error) {
      message.error('获取用户信息失败');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.put(`/users/${user._id}`, {
        nickname: values.nickname,
        bio: values.bio,
        interests: values.interests ? values.interests.split(',') : [],
      });

      if (response.data.success) {
        setUser(response.data.data.user);
        setUserInfo(response.data.data.user);
        message.success('更新成功！');
      }
    } catch (error) {
      message.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Avatar size={100} src={userInfo.avatar} icon={<UserOutlined />} />
          <h2 style={{ marginTop: '20px' }}>{userInfo.username}</h2>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            nickname: userInfo.profile?.nickname || '',
            bio: userInfo.profile?.bio || '',
            interests: userInfo.profile?.interests?.join(',') || '',
          }}
        >
          <Form.Item label="昵称" name="nickname">
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item label="简介" name="bio">
            <TextArea rows={4} placeholder="请输入个人简介" />
          </Form.Item>

          <Form.Item label="兴趣标签" name="interests">
            <Input placeholder="请输入兴趣标签，用逗号分隔" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;

