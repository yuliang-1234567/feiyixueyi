import React, { useMemo, useState } from 'react';
import { Button, Drawer, Grid, Layout, Menu, Typography } from 'antd';
import {
	DashboardOutlined,
	TeamOutlined,
	PictureOutlined,
	StarOutlined,
	ShopOutlined,
	OrderedListOutlined,
	RobotOutlined,
	LogoutOutlined,
	MenuOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AdminThemeProvider from './AdminThemeProvider';
import './AdminLayout.css';

const { useBreakpoint } = Grid;
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
	const screens = useBreakpoint();
	const [mobileOpen, setMobileOpen] = useState(false);

	const handleLogout = () => {
		logout();
		navigate('/login');
	};

	const selectedKey = useMemo(
		() => normalizeSelectedKey(location.pathname),
		[location.pathname]
	);

	const adminMenu = (
		<Menu
			theme="dark"
			mode="inline"
			selectedKeys={[selectedKey]}
			items={menuItems}
			onClick={() => setMobileOpen(false)}
		/>
	);

	const isDesktop = !!screens.lg;

	return (
		<AdminThemeProvider>
			<Layout className="adminLayout">
				{isDesktop ? (
					<Sider className="adminSider" width={240}>
						<div className="adminBrand">
							<Title level={4} className="adminBrandTitle">
								非遗学艺后台
							</Title>
							<Text className="adminBrandSubtitle">Admin Panel</Text>
						</div>
						{adminMenu}
						<div className="adminSiderFooter">
							<Button block icon={<LogoutOutlined />} onClick={handleLogout}>
								退出登录
							</Button>
						</div>
					</Sider>
				) : null}

				<Layout className="adminMain">
					{!isDesktop ? (
						<div className="adminMobileHeader">
							<Button
								aria-label="打开菜单"
								icon={<MenuOutlined />}
								onClick={() => setMobileOpen(true)}
							/>
							<div style={{ textAlign: 'center', flex: 1 }}>
								<div className="adminMobileTitle">非遗学艺后台</div>
								<div className="adminMobileHint">{selectedKey.replace('/admin/', '')}</div>
							</div>
							<Button aria-label="退出登录" icon={<LogoutOutlined />} onClick={handleLogout} />
						</div>
					) : null}

					<Content className="adminContentWrap">
						<div className="adminPageSurface">
							<Outlet />
						</div>
					</Content>
				</Layout>
			</Layout>

			{!isDesktop ? (
				<Drawer
					title="后台菜单"
					placement="left"
					open={mobileOpen}
					onClose={() => setMobileOpen(false)}
					width={280}
					bodyStyle={{ padding: 0 }}
				>
					{adminMenu}
					<div style={{ padding: 12 }}>
						<Button block icon={<LogoutOutlined />} onClick={handleLogout}>
							退出登录
						</Button>
					</div>
				</Drawer>
			) : null}
		</AdminThemeProvider>
	);
};

export default AdminLayout;
