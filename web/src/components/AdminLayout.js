import React from 'react';
import { Layout, Menu, Typography, Button } from 'antd';
import {
	DashboardOutlined,
	TeamOutlined,
	PictureOutlined,
	StarOutlined,
	ShopOutlined,
	OrderedListOutlined,
	RobotOutlined,
	LogoutOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const menuItems = [
	{
		key: '/admin/dashboard',
		icon: <DashboardOutlined />,
		label: <Link to="/admin/dashboard">数据看板</Link>,
	},
	{
		key: '/admin/users',
		icon: <TeamOutlined />,
		label: <Link to="/admin/users">用户管理</Link>,
	},
	{
		key: '/admin/artworks',
		icon: <PictureOutlined />,
		label: <Link to="/admin/artworks">作品管理</Link>,
	},
	{
		key: '/admin/favorites',
		icon: <StarOutlined />,
		label: <Link to="/admin/favorites">收藏管理</Link>,
	},
	{
		key: '/admin/products',
		icon: <ShopOutlined />,
		label: <Link to="/admin/products">商品管理</Link>,
	},
	{
		key: '/admin/orders',
		icon: <OrderedListOutlined />,
		label: <Link to="/admin/orders">订单管理</Link>,
	},
	{
		key: '/admin/ai-monitor',
		icon: <RobotOutlined />,
		label: <Link to="/admin/ai-monitor">AI调用监控</Link>,
	},
];

const normalizeSelectedKey = (pathname) => {
	if (pathname.startsWith('/admin/dashboard')) return '/admin/dashboard';
	if (pathname.startsWith('/admin/users')) return '/admin/users';
	if (pathname.startsWith('/admin/artworks')) return '/admin/artworks';
	if (pathname.startsWith('/admin/favorites')) return '/admin/favorites';
	if (pathname.startsWith('/admin/products')) return '/admin/products';
	if (pathname.startsWith('/admin/orders')) return '/admin/orders';
	if (pathname.startsWith('/admin/ai-monitor')) return '/admin/ai-monitor';
	return '/admin/dashboard';
};

const AdminLayout = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { logout } = useAuthStore();

	const handleLogout = () => {
		logout();
		navigate('/login');
	};

	return (
		<Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
			<Sider breakpoint="lg" collapsedWidth="0" width={240} style={{ position: 'relative' }}>
				<div style={{ padding: '20px 16px', color: '#fff' }}>
					<Title level={4} style={{ color: '#fff', margin: 0 }}>
						非遗学艺后台
					</Title>
					<Text style={{ color: 'rgba(255,255,255,0.7)' }}>Admin Panel</Text>
				</div>
				<Menu
					theme="dark"
					mode="inline"
					selectedKeys={[normalizeSelectedKey(location.pathname)]}
					items={menuItems}
				/>
				<div
					style={{
						position: 'absolute',
						left: 12,
						right: 12,
						bottom: 32,
					}}
				>
					<Button
						block
						icon={<LogoutOutlined />}
						onClick={handleLogout}
					>
						退出登录
					</Button>
				</div>
			</Sider>

			<Layout>
				<Content style={{ margin: 20 }}>
					<Outlet />
				</Content>
			</Layout>
		</Layout>
	);
};

export default AdminLayout;
