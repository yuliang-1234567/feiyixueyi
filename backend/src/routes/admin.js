const express = require('express');
const { Op } = require('sequelize');
const { authenticate, isAdmin } = require('../middleware/auth');
const OrderAdminNote = require('../models/OrderAdminNote');
const AIInvocationLog = require('../models/AIInvocationLog');
const {
	User,
	Artwork,
	ArtworkLike,
	Product,
	Order,
	News,
	View,
	HeritageQuizFavorite,
	HeritageQuizQuestion,
} = require('../models/associations');

const router = express.Router();

let ensureQuizFavoriteTablePromise = null;
let ensureOrderNoteTablePromise = null;
let ensureAiLogTablePromise = null;

async function ensureQuizFavoriteTable() {
	if (!ensureQuizFavoriteTablePromise) {
		ensureQuizFavoriteTablePromise = HeritageQuizFavorite.sync().catch((error) => {
			ensureQuizFavoriteTablePromise = null;
			throw error;
		});
	}

	await ensureQuizFavoriteTablePromise;
}

async function ensureOrderNoteTable() {
	if (!ensureOrderNoteTablePromise) {
		ensureOrderNoteTablePromise = OrderAdminNote.sync().catch((error) => {
			ensureOrderNoteTablePromise = null;
			throw error;
		});
	}

	await ensureOrderNoteTablePromise;
}

async function ensureAiLogTable() {
	if (!ensureAiLogTablePromise) {
		ensureAiLogTablePromise = AIInvocationLog.sync().catch((error) => {
			ensureAiLogTablePromise = null;
			throw error;
		});
	}

	await ensureAiLogTablePromise;
}

router.use(authenticate, isAdmin);

function getDayStart(date = new Date()) {
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);
	return dayStart;
}

// 数据看板（P1）：今日关键指标 + 热门榜 + 活跃时段 + 漏斗
router.get('/dashboard/p1', async (req, res) => {
	try {
		const now = new Date();
		const todayStart = getDayStart(now);
		const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

		const paidStatuses = ['paid', 'shipped', 'completed'];

		const [
			newUsersToday,
			newOrdersToday,
			paidOrdersToday,
			allTodayViews,
			hotArtworks,
			hotProducts,
			productViews7d,
			orders7d,
			users7d,
			paidOrdersAmount7d,
			funnelProductViews7d,
			funnelAddCartProxy7d,
			funnelOrders7d,
			funnelPaid7d,
		] = await Promise.all([
			User.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
			Order.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
			Order.count({
				where: {
					createdAt: { [Op.gte]: todayStart },
					status: { [Op.in]: paidStatuses },
				},
			}),
			View.findAll({
				where: { createdAt: { [Op.gte]: todayStart } },
				attributes: ['userId', 'ipAddress'],
				raw: true,
			}),
			Artwork.findAll({
				attributes: ['id', 'title', 'views', 'likesCount'],
				where: { deletedAt: null },
				order: [
					['views', 'DESC'],
					['likesCount', 'DESC'],
				],
				limit: 5,
				raw: true,
			}),
			Product.findAll({
				attributes: ['id', 'name', 'sales', 'views', 'price'],
				where: { deletedAt: null },
				order: [
					['sales', 'DESC'],
					['views', 'DESC'],
				],
				limit: 5,
				raw: true,
			}),
			View.findAll({
				where: {
					targetType: 'product',
					createdAt: { [Op.gte]: sevenDaysAgo },
				},
				attributes: ['createdAt'],
				raw: true,
			}),
			Order.findAll({
				where: { createdAt: { [Op.gte]: sevenDaysAgo } },
				attributes: ['createdAt'],
				raw: true,
			}),
			User.findAll({
				where: { createdAt: { [Op.gte]: sevenDaysAgo } },
				attributes: ['createdAt'],
				raw: true,
			}),
			Order.findAll({
				where: {
					createdAt: { [Op.gte]: sevenDaysAgo },
					status: { [Op.in]: paidStatuses },
				},
				attributes: ['createdAt', 'totalAmount'],
				raw: true,
			}),
			View.count({
				where: {
					targetType: 'product',
					createdAt: { [Op.gte]: sevenDaysAgo },
				},
			}),
			Order.count({
				where: {
					status: 'pending',
					createdAt: { [Op.gte]: sevenDaysAgo },
				},
			}),
			Order.count({
				where: {
					createdAt: { [Op.gte]: sevenDaysAgo },
				},
			}),
			Order.count({
				where: {
					status: { [Op.in]: paidStatuses },
					createdAt: { [Op.gte]: sevenDaysAgo },
				},
			}),
		]);

		const [todayRevenueRaw] = await Order.findAll({
			where: {
				createdAt: { [Op.gte]: todayStart },
				status: { [Op.in]: paidStatuses },
			},
			attributes: [[Order.sequelize.fn('COALESCE', Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')), 0), 'sumAmount']],
			raw: true,
		});

		const uniqueViewerSet = new Set(
			(allTodayViews || []).map((row) => {
				if (row.userId) return `u_${row.userId}`;
				if (row.ipAddress) return `ip_${row.ipAddress}`;
				return '';
			}).filter(Boolean)
		);

		const todayRevenue = Number(todayRevenueRaw?.sumAmount || 0);
		const todayConversionRate = uniqueViewerSet.size > 0
			? Number(((paidOrdersToday / uniqueViewerSet.size) * 100).toFixed(2))
			: 0;

		const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
			hour: String(hour).padStart(2, '0') + ':00',
			views: 0,
			orders: 0,
			activity: 0,
		}));

		for (const row of productViews7d || []) {
			const hour = new Date(row.createdAt).getHours();
			hourBuckets[hour].views += 1;
			hourBuckets[hour].activity += 1;
		}

		for (const row of orders7d || []) {
			const hour = new Date(row.createdAt).getHours();
			hourBuckets[hour].orders += 1;
			hourBuckets[hour].activity += 1;
		}

		const dayBuckets = Array.from({ length: 7 }, (_, i) => {
			const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
			const key = d.toISOString().slice(0, 10);
			return { date: key, newUsers: 0, newOrders: 0, revenue: 0 };
		});

		const dayMap = new Map(dayBuckets.map((b) => [b.date, b]));

		for (const row of users7d || []) {
			const key = new Date(row.createdAt).toISOString().slice(0, 10);
			const bucket = dayMap.get(key);
			if (bucket) bucket.newUsers += 1;
		}

		for (const row of orders7d || []) {
			const key = new Date(row.createdAt).toISOString().slice(0, 10);
			const bucket = dayMap.get(key);
			if (bucket) bucket.newOrders += 1;
		}

		for (const row of paidOrdersAmount7d || []) {
			const key = new Date(row.createdAt).toISOString().slice(0, 10);
			const bucket = dayMap.get(key);
			if (bucket) bucket.revenue += Number(row.totalAmount || 0);
		}

		const topActiveHours = [...hourBuckets]
			.sort((a, b) => b.activity - a.activity)
			.slice(0, 5);

		const funnel = {
			browse: Number(funnelProductViews7d || 0),
			addToCart: Number(funnelAddCartProxy7d || 0),
			placeOrder: Number(funnelOrders7d || 0),
			pay: Number(funnelPaid7d || 0),
		};

		return res.json({
			success: true,
			data: {
				today: {
					newUsers: Number(newUsersToday || 0),
					newOrders: Number(newOrdersToday || 0),
					revenue: Number(todayRevenue.toFixed(2)),
					conversionRate: todayConversionRate,
					paidOrders: Number(paidOrdersToday || 0),
					uniqueViewers: uniqueViewerSet.size,
				},
				hot: {
					artworks: hotArtworks || [],
					products: hotProducts || [],
				},
				activeHours: {
					range: '近7天',
					buckets: hourBuckets,
					top: topActiveHours,
				},
				trend: {
					range: '近7天',
					days: dayBuckets.map((b) => ({
						date: b.date,
						newUsers: b.newUsers,
						newOrders: b.newOrders,
						revenue: Number(b.revenue.toFixed(2)),
					})),
				},
				funnel: {
					range: '近7天',
					steps: funnel,
					conversion: {
						browseToCart: funnel.browse > 0 ? Number(((funnel.addToCart / funnel.browse) * 100).toFixed(2)) : 0,
						cartToOrder: funnel.addToCart > 0 ? Number(((funnel.placeOrder / funnel.addToCart) * 100).toFixed(2)) : 0,
						orderToPay: funnel.placeOrder > 0 ? Number(((funnel.pay / funnel.placeOrder) * 100).toFixed(2)) : 0,
					},
					definition: {
						browse: '商品浏览量（product views）',
						addToCart: '加购代理指标：pending 状态订单数（当前系统未单独持久化购物车）',
						placeOrder: '订单创建数（orders）',
						pay: '已支付订单数（paid/shipped/completed）',
					},
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取数据看板失败',
			error: error.message,
		});
	}
});

// AI 调用监控（P1）
router.get('/ai-monitor/overview', async (req, res) => {
	try {
		await ensureAiLogTable();

		const daysRaw = Number(req.query.days || 7);
		const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(60, Math.floor(daysRaw))) : 7;
		const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const logs = await AIInvocationLog.findAll({
			where: { createdAt: { [Op.gte]: startAt } },
			attributes: [
				'id',
				'feature',
				'endpoint',
				'provider',
				'model',
				'success',
				'latencyMs',
				'downgraded',
				'costCny',
				'errorReason',
				'createdAt',
			],
			raw: true,
			order: [['createdAt', 'DESC']],
		});

		const totalCalls = logs.length;
		const successCalls = logs.filter((item) => item.success).length;
		const failureCalls = totalCalls - successCalls;
		const downgradedCalls = logs.filter((item) => item.downgraded).length;
		const totalLatency = logs.reduce((sum, item) => sum + Number(item.latencyMs || 0), 0);
		const totalCost = logs.reduce((sum, item) => sum + Number(item.costCny || 0), 0);

		const successRate = totalCalls > 0 ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0;
		const avgLatencyMs = totalCalls > 0 ? Number((totalLatency / totalCalls).toFixed(2)) : 0;
		const downgradeHitRate = totalCalls > 0 ? Number(((downgradedCalls / totalCalls) * 100).toFixed(2)) : 0;

		const modelMap = new Map();
		for (const item of logs) {
			const key = String(item.model || item.provider || 'unknown');
			const prev = modelMap.get(key) || {
				name: key,
				calls: 0,
				success: 0,
				latency: 0,
				cost: 0,
			};

			prev.calls += 1;
			if (item.success) prev.success += 1;
			prev.latency += Number(item.latencyMs || 0);
			prev.cost += Number(item.costCny || 0);
			modelMap.set(key, prev);
		}

		const modelStats = [...modelMap.values()]
			.sort((a, b) => b.calls - a.calls)
			.map((item) => ({
				name: item.name,
				calls: item.calls,
				successRate: item.calls > 0 ? Number(((item.success / item.calls) * 100).toFixed(2)) : 0,
				avgLatencyMs: item.calls > 0 ? Number((item.latency / item.calls).toFixed(2)) : 0,
				costCny: Number(item.cost.toFixed(6)),
			}))
			.slice(0, 10);

		const reasonMap = new Map();
		for (const item of logs) {
			if (item.success) continue;
			const reason = String(item.errorReason || 'unknown').trim() || 'unknown';
			reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
		}

		const failureReasonTop = [...reasonMap.entries()]
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8);

		return res.json({
			success: true,
			data: {
				range: {
					days,
					startAt,
				},
				summary: {
					totalCalls,
					successCalls,
					failureCalls,
					successRate,
					avgLatencyMs,
					totalCostCny: Number(totalCost.toFixed(6)),
					downgradeHitRate,
					downgradedCalls,
				},
				modelStats,
				failureReasonTop,
				recentLogs: logs.slice(0, 50),
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取AI调用监控失败',
			error: error.message,
		});
	}
});

// 后台概览：用于管理首页首屏统计
router.get('/overview', async (req, res) => {
	try {
		const [userCount, artworkCount, productCount, orderCount, newsCount] = await Promise.all([
			User.count(),
			Artwork.count(),
			Product.count(),
			Order.count(),
			News.count(),
		]);

		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const [newUsersToday, newOrdersToday] = await Promise.all([
			User.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
			Order.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
		]);

		return res.json({
			success: true,
			data: {
				counts: {
					users: userCount,
					artworks: artworkCount,
					products: productCount,
					orders: orderCount,
					news: newsCount,
				},
				today: {
					newUsers: newUsersToday,
					newOrders: newOrdersToday,
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取后台概览失败',
			error: error.message,
		});
	}
});

// 用户管理：最小可用列表接口
router.get('/users', async (req, res) => {
	try {
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
		const offset = (page - 1) * limit;

		const { count, rows } = await User.findAndCountAll({
			attributes: { exclude: ['password'] },
			order: [['createdAt', 'DESC']],
			limit,
			offset,
		});

		return res.json({
			success: true,
			data: {
				users: rows,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取用户列表失败',
			error: error.message,
		});
	}
});

// 用户管理：创建用户
router.post('/users', async (req, res) => {
	try {
		const username = String(req.body?.username || '').trim();
		const email = String(req.body?.email || '').trim().toLowerCase();
		const password = String(req.body?.password || '');
		const role = String(req.body?.role || 'user').trim() || 'user';

		if (!username || !email || !password) {
			return res.status(400).json({
				success: false,
				message: '请提供用户名、邮箱和密码',
			});
		}

		if (username.length < 3 || username.length > 20) {
			return res.status(400).json({
				success: false,
				message: '用户名长度需在 3-20 个字符之间',
			});
		}

		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: '密码长度不能少于 6 位',
			});
		}

		if (!['user', 'artist', 'admin'].includes(role)) {
			return res.status(400).json({
				success: false,
				message: '无效的角色类型',
			});
		}

		const exists = await User.findOne({
			where: {
				[Op.or]: [{ username }, { email }],
			},
		});

		if (exists) {
			return res.status(400).json({
				success: false,
				message: '用户名或邮箱已存在',
			});
		}

		const created = await User.create({
			username,
			email,
			password,
			role,
		});

		return res.status(201).json({
			success: true,
			message: '用户创建成功',
			data: {
				user: created.toJSON(),
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '创建用户失败',
			error: error.message,
		});
	}
});

// 用户管理：删除用户
router.delete('/users/:id', async (req, res) => {
	try {
		const userId = Number(req.params.id);
		if (!Number.isInteger(userId) || userId <= 0) {
			return res.status(400).json({
				success: false,
				message: '无效的用户ID',
			});
		}

		if (Number(req.user?.id) === userId) {
			return res.status(400).json({
				success: false,
				message: '不能删除当前登录账号',
			});
		}

		const target = await User.findByPk(userId);
		if (!target) {
			return res.status(404).json({
				success: false,
				message: '用户不存在',
			});
		}

		if (target.role === 'admin') {
			const adminCount = await User.count({ where: { role: 'admin' } });
			if (adminCount <= 1) {
				return res.status(400).json({
					success: false,
					message: '至少需要保留一个管理员账号',
				});
			}
		}

		await target.destroy();

		return res.json({
			success: true,
			message: '用户删除成功',
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '删除用户失败',
			error: error.message,
		});
	}
});

// 收藏管理：作品收藏列表（支持查看小程序收藏写入的后端记录）
router.get('/favorites/artworks', async (req, res) => {
	try {
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
		const offset = (page - 1) * limit;
		const keyword = String(req.query.keyword || '').trim();

		const include = [
			{
				model: User,
				as: 'user',
				attributes: ['id', 'username', 'email', 'role'],
				required: true,
			},
			{
				model: Artwork,
				as: 'artwork',
				attributes: ['id', 'title', 'imageUrl', 'category', 'status', 'authorId'],
				required: true,
				where: { deletedAt: null },
				include: [
					{
						model: User,
						as: 'author',
						attributes: ['id', 'username', 'email'],
						required: false,
					},
				],
			},
		];

		if (keyword) {
			include[1].where = {
				...include[1].where,
				[Op.or]: [
					{ title: { [Op.like]: `%${keyword}%` } },
				],
			};
		}

		const { count, rows } = await ArtworkLike.findAndCountAll({
			include,
			order: [['createdAt', 'DESC']],
			limit,
			offset,
		});

		return res.json({
			success: true,
			data: {
				list: rows,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取作品收藏列表失败',
			error: error.message,
		});
	}
});

// 收藏管理：题目收藏列表
router.get('/favorites/quiz', async (req, res) => {
	try {
		await ensureQuizFavoriteTable();

		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
		const offset = (page - 1) * limit;
		const keyword = String(req.query.keyword || '').trim();

		const include = [
			{
				model: User,
				as: 'user',
				attributes: ['id', 'username', 'email', 'role'],
				required: true,
			},
			{
				model: HeritageQuizQuestion,
				as: 'question',
				attributes: ['id', 'categoryName', 'questionType', 'difficulty', 'stem', 'sourceType', 'status'],
				required: true,
			},
		];

		if (keyword) {
			include[1].where = {
				stem: { [Op.like]: `%${keyword}%` },
			};
		}

		const { count, rows } = await HeritageQuizFavorite.findAndCountAll({
			include,
			order: [['createdAt', 'DESC']],
			limit,
			offset,
		});

		return res.json({
			success: true,
			data: {
				list: rows,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取题目收藏列表失败',
			error: error.message,
		});
	}
});

// 作品管理：列表 + 搜索 + 筛选
router.get('/artworks', async (req, res) => {
	try {
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
		const offset = (page - 1) * limit;

		const { keyword, status, category, authorId } = req.query;
		const where = {};

		if (keyword) {
			where[Op.or] = [
				{ title: { [Op.like]: `%${keyword}%` } },
				{ description: { [Op.like]: `%${keyword}%` } },
			];
		}
		if (status) where.status = status;
		if (category) where.category = category;
		if (authorId) where.authorId = Number(authorId);

		const { count, rows } = await Artwork.findAndCountAll({
			where,
			include: [
				{
					model: User,
					as: 'author',
					attributes: ['id', 'username', 'email', 'role'],
					required: false,
				},
			],
			order: [['createdAt', 'DESC']],
			limit,
			offset,
		});

		return res.json({
			success: true,
			data: {
				artworks: rows,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取作品列表失败',
			error: error.message,
		});
	}
});

// 作品管理：状态更新（发布/隐藏/草稿）
router.patch('/artworks/:id/status', async (req, res) => {
	try {
		const status = String(req.body?.status || '').trim();
		if (!['draft', 'published', 'hidden'].includes(status)) {
			return res.status(400).json({
				success: false,
				message: '无效的作品状态',
			});
		}

		const artwork = await Artwork.findByPk(req.params.id);
		if (!artwork) {
			return res.status(404).json({
				success: false,
				message: '作品不存在或已删除',
			});
		}

		await artwork.update({ status });

		return res.json({
			success: true,
			message: '作品状态更新成功',
			data: { artwork },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '更新作品状态失败',
			error: error.message,
		});
	}
});

// 作品管理：删除（软删除）
router.delete('/artworks/:id', async (req, res) => {
	try {
		const artwork = await Artwork.findByPk(req.params.id);
		if (!artwork) {
			return res.status(404).json({
				success: false,
				message: '作品不存在或已删除',
			});
		}

		await artwork.destroy();

		return res.json({
			success: true,
			message: '作品删除成功',
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '删除作品失败',
			error: error.message,
		});
	}
});

// 商品管理：列表 + 搜索 + 筛选
router.get('/products', async (req, res) => {
	try {
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
		const offset = (page - 1) * limit;

		const {
			keyword,
			status,
			category,
			violationStatus,
			reviewStatus,
			creatorId,
			priceMin,
			priceMax,
		} = req.query;

		const where = {
			deletedAt: null,
		};

		if (keyword) {
			where[Op.or] = [
				{ name: { [Op.like]: `%${keyword}%` } },
				{ description: { [Op.like]: `%${keyword}%` } },
			];
		}
		if (status) where.status = status;
		if (category) where.category = category;
		if (violationStatus) where.violationStatus = violationStatus;
		if (reviewStatus) where.reviewStatus = reviewStatus;
		if (creatorId) where.creatorId = Number(creatorId);

		if (priceMin || priceMax) {
			where.price = {};
			if (priceMin) where.price[Op.gte] = Number(priceMin);
			if (priceMax) where.price[Op.lte] = Number(priceMax);
		}

		const { count, rows } = await Product.findAndCountAll({
			where,
			include: [
				{
					model: User,
					as: 'creator',
					attributes: ['id', 'username', 'email', 'role'],
					required: false,
				},
				{
					model: Artwork,
					as: 'pattern',
					attributes: ['id', 'title', 'imageUrl'],
					required: false,
				},
			],
			order: [['createdAt', 'DESC']],
			limit,
			offset,
		});

		return res.json({
			success: true,
			data: {
				products: rows,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取商品列表失败',
			error: error.message,
		});
	}
});

// 商品管理：详情
router.get('/products/:id', async (req, res) => {
	try {
		const product = await Product.findOne({
			where: { id: req.params.id, deletedAt: null },
			include: [
				{
					model: User,
					as: 'creator',
					attributes: ['id', 'username', 'email', 'role'],
					required: false,
				},
				{
					model: Artwork,
					as: 'pattern',
					attributes: ['id', 'title', 'imageUrl'],
					required: false,
				},
			],
		});

		if (!product) {
			return res.status(404).json({
				success: false,
				message: '商品不存在或已删除',
			});
		}

		return res.json({
			success: true,
			data: { product },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取商品详情失败',
			error: error.message,
		});
	}
});

// 商品管理：详情编辑
router.put('/products/:id', async (req, res) => {
	try {
		const product = await Product.findOne({
			where: { id: req.params.id, deletedAt: null },
		});

		if (!product) {
			return res.status(404).json({
				success: false,
				message: '商品不存在或已删除',
			});
		}

		const {
			name,
			description,
			images,
			category,
			price,
			originalPrice,
			stock,
			status,
			material,
			size,
			origin,
			craftsmanship,
			culturalMeaning,
			violationStatus,
			reviewStatus,
			reviewReason,
		} = req.body;

		const updateData = {};
		if (name !== undefined) updateData.name = String(name).trim();
		if (description !== undefined) updateData.description = description || '';
		if (images !== undefined) {
			if (Array.isArray(images)) {
				updateData.images = images.filter(Boolean);
			} else if (typeof images === 'string') {
				updateData.images = images
					.split('\n')
					.map((item) => item.trim())
					.filter(Boolean);
			}
		}
		if (category !== undefined) updateData.category = category;
		if (price !== undefined) updateData.price = Number(price);
		if (originalPrice !== undefined) {
			updateData.originalPrice =
				originalPrice === null || originalPrice === '' ? null : Number(originalPrice);
		}
		if (stock !== undefined) updateData.stock = Number(stock);
		if (status !== undefined) updateData.status = status;
		if (material !== undefined) updateData.material = material;
		if (size !== undefined) updateData.size = size;
		if (origin !== undefined) updateData.origin = origin;
		if (craftsmanship !== undefined) updateData.craftsmanship = craftsmanship;
		if (culturalMeaning !== undefined) updateData.culturalMeaning = culturalMeaning;
		if (violationStatus !== undefined) updateData.violationStatus = violationStatus;
		if (reviewStatus !== undefined) updateData.reviewStatus = reviewStatus;
		if (reviewReason !== undefined) updateData.reviewReason = reviewReason;

		await product.update(updateData);

		return res.json({
			success: true,
			message: '商品更新成功',
			data: { product },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '更新商品失败',
			error: error.message,
		});
	}
});

// 商品管理：删除（软删除，前台自动不可见）
router.delete('/products/:id', async (req, res) => {
	try {
		const product = await Product.findOne({
			where: { id: req.params.id, deletedAt: null },
		});

		if (!product) {
			return res.status(404).json({
				success: false,
				message: '商品不存在或已删除',
			});
		}

		await product.destroy();

		return res.json({
			success: true,
			message: '商品删除成功',
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '删除商品失败',
			error: error.message,
		});
	}
});

// 商品管理：批量修改（上架/下架、库存、价格）
router.patch('/products/batch', async (req, res) => {
	try {
		const { ids, action, payload = {} } = req.body;
		if (!Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({
				success: false,
				message: '请提供要操作的商品ID列表',
			});
		}

		const products = await Product.findAll({
			where: {
				id: { [Op.in]: ids },
				deletedAt: null,
			},
		});

		if (!products.length) {
			return res.status(404).json({
				success: false,
				message: '未找到可操作的商品',
			});
		}

		if (action === 'setStatus') {
			if (!['draft', 'published', 'sold_out'].includes(payload.status)) {
				return res.status(400).json({ success: false, message: '无效的状态值' });
			}
			await Product.update(
				{ status: payload.status },
				{ where: { id: { [Op.in]: ids }, deletedAt: null } }
			);
		} else if (action === 'setStock') {
			const stock = Number(payload.stock);
			if (Number.isNaN(stock) || stock < 0) {
				return res.status(400).json({ success: false, message: '库存值不合法' });
			}
			await Product.update(
				{ stock },
				{ where: { id: { [Op.in]: ids }, deletedAt: null } }
			);
		} else if (action === 'adjustStock') {
			const delta = Number(payload.delta);
			if (Number.isNaN(delta)) {
				return res.status(400).json({ success: false, message: '库存增量不合法' });
			}
			await Promise.all(
				products.map(async (product) => {
					const nextStock = Math.max(0, Number(product.stock || 0) + delta);
					await product.update({ stock: nextStock });
				})
			);
		} else if (action === 'setPrice') {
			const price = Number(payload.price);
			if (Number.isNaN(price) || price <= 0) {
				return res.status(400).json({ success: false, message: '价格不合法' });
			}
			await Product.update(
				{ price },
				{ where: { id: { [Op.in]: ids }, deletedAt: null } }
			);
		} else if (action === 'adjustPricePercent') {
			const percent = Number(payload.percent);
			if (Number.isNaN(percent)) {
				return res.status(400).json({ success: false, message: '价格百分比不合法' });
			}
			await Promise.all(
				products.map(async (product) => {
					const base = Number(product.price || 0);
					const next = Math.max(0.01, base * (1 + percent / 100));
					await product.update({ price: Number(next.toFixed(2)) });
				})
			);
		} else {
			return res.status(400).json({
				success: false,
				message: '不支持的批量操作类型',
			});
		}

		return res.json({
			success: true,
			message: '批量操作成功',
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '批量操作失败',
			error: error.message,
		});
	}
});

// 商品管理：违规下架
router.patch('/products/:id/violation/offline', async (req, res) => {
	try {
		const { reason } = req.body;
		const product = await Product.findOne({
			where: { id: req.params.id, deletedAt: null },
		});

		if (!product) {
			return res.status(404).json({
				success: false,
				message: '商品不存在或已删除',
			});
		}

		await product.update({
			status: 'draft',
			violationStatus: 'confirmed',
			reviewStatus: 'rejected',
			offlineReason: reason || '违反平台规范，已下架',
			reviewReason: reason || '违规下架',
			reviewedBy: req.user.id,
			reviewedAt: new Date(),
			rejectCount: Number(product.rejectCount || 0) + 1,
		});

		return res.json({
			success: true,
			message: '违规下架成功',
			data: { product },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '违规下架失败',
			error: error.message,
		});
	}
});

// 商品管理：复审
router.patch('/products/:id/review', async (req, res) => {
	try {
		const { decision, reason } = req.body;
		const product = await Product.findOne({
			where: { id: req.params.id, deletedAt: null },
		});

		if (!product) {
			return res.status(404).json({
				success: false,
				message: '商品不存在或已删除',
			});
		}

		if (!['approve', 'reject', 'reopen'].includes(decision)) {
			return res.status(400).json({
				success: false,
				message: '复审操作不合法',
			});
		}

		const updateData = {
			reviewedBy: req.user.id,
			reviewedAt: new Date(),
			reviewReason: reason || null,
		};

		if (decision === 'approve') {
			updateData.reviewStatus = 'approved';
			updateData.violationStatus = 'normal';
			updateData.status = 'published';
			updateData.offlineReason = null;
		} else if (decision === 'reject') {
			updateData.reviewStatus = 'rejected';
			updateData.status = 'draft';
			updateData.rejectCount = Number(product.rejectCount || 0) + 1;
		} else if (decision === 'reopen') {
			updateData.reviewStatus = 'reopened';
			updateData.violationStatus = 'suspected';
		}

		await product.update(updateData);

		return res.json({
			success: true,
			message: '复审结果已更新',
			data: { product },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '复审操作失败',
			error: error.message,
		});
	}
});

// 订单中心：列表 + 时间/用户筛选 + 关键词搜索
router.get('/orders', async (req, res) => {
	try {
		await ensureOrderNoteTable();

		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
		const offset = (page - 1) * limit;

		const keyword = String(req.query.keyword || '').trim();
		const status = String(req.query.status || '').trim();
		const orderId = Number(req.query.id);
		const userId = Number(req.query.userId);
		const startDate = String(req.query.startDate || '').trim();
		const endDate = String(req.query.endDate || '').trim();

		const where = {};
		if (status && ['pending', 'paid', 'shipped', 'completed', 'cancelled'].includes(status)) {
			where.status = status;
		}
		if (Number.isInteger(orderId) && orderId > 0) {
			where.id = orderId;
		}
		if (Number.isInteger(userId) && userId > 0) {
			where.userId = userId;
		}

		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) {
				const parsedStart = new Date(startDate);
				if (!Number.isNaN(parsedStart.getTime())) {
					where.createdAt[Op.gte] = parsedStart;
				}
			}
			if (endDate) {
				const parsedEnd = new Date(endDate);
				if (!Number.isNaN(parsedEnd.getTime())) {
					if (!endDate.includes('T')) {
						parsedEnd.setHours(23, 59, 59, 999);
					}
					where.createdAt[Op.lte] = parsedEnd;
				}
			}
			if (!Object.keys(where.createdAt).length) {
				delete where.createdAt;
			}
		}

		if (keyword) {
			const keywordOr = [
				{ shippingName: { [Op.like]: `%${keyword}%` } },
				{ shippingPhone: { [Op.like]: `%${keyword}%` } },
				{ '$user.username$': { [Op.like]: `%${keyword}%` } },
				{ '$user.email$': { [Op.like]: `%${keyword}%` } },
			];

			if (/^\d+$/.test(keyword)) {
				keywordOr.push({ id: Number(keyword) });
			}

			where[Op.and] = where[Op.and] || [];
			where[Op.and].push({ [Op.or]: keywordOr });
		}

		const { count, rows } = await Order.findAndCountAll({
			where,
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['id', 'username', 'email', 'role'],
					required: false,
				},
			],
			order: [['createdAt', 'DESC']],
			limit,
			offset,
			subQuery: false,
		});

		const orderIds = rows.map((row) => Number(row.id)).filter(Boolean);
		const noteList = orderIds.length
			? await OrderAdminNote.findAll({
				where: { orderId: { [Op.in]: orderIds } },
				raw: true,
			})
			: [];

		const notesMap = new Map();
		for (const note of noteList) {
			const existing = notesMap.get(note.orderId) || {
				refundNote: '',
				afterSaleNote: '',
				updatedAt: null,
			};

			if (note.type === 'refund') {
				existing.refundNote = note.note || '';
			} else if (note.type === 'after_sale') {
				existing.afterSaleNote = note.note || '';
			}

			if (!existing.updatedAt || new Date(note.updatedAt) > new Date(existing.updatedAt)) {
				existing.updatedAt = note.updatedAt;
			}

			notesMap.set(note.orderId, existing);
		}

		const orders = rows.map((row) => {
			const json = row.toJSON();
			return {
				...json,
				serviceNotes: notesMap.get(row.id) || {
					refundNote: '',
					afterSaleNote: '',
					updatedAt: null,
				},
			};
		});

		return res.json({
			success: true,
			data: {
				orders,
				pagination: {
					page,
					limit,
					total: count,
					totalPages: Math.ceil(count / limit),
				},
			},
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '获取订单列表失败',
			error: error.message,
		});
	}
});

// 订单中心：状态流转
router.patch('/orders/:id/status', async (req, res) => {
	try {
		const orderId = Number(req.params.id);
		const nextStatus = String(req.body?.status || '').trim();

		if (!Number.isInteger(orderId) || orderId <= 0) {
			return res.status(400).json({ success: false, message: '无效的订单ID' });
		}

		const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
		if (!validStatuses.includes(nextStatus)) {
			return res.status(400).json({ success: false, message: '无效的订单状态' });
		}

		const order = await Order.findByPk(orderId);
		if (!order) {
			return res.status(404).json({ success: false, message: '订单不存在' });
		}

		const currentStatus = order.status;
		const transitions = {
			pending: ['paid', 'cancelled'],
			paid: ['shipped', 'cancelled'],
			shipped: ['completed'],
			completed: [],
			cancelled: [],
		};

		if (currentStatus === nextStatus) {
			return res.json({
				success: true,
				message: '订单状态未变化',
				data: { order },
			});
		}

		if (!transitions[currentStatus]?.includes(nextStatus)) {
			return res.status(400).json({
				success: false,
				message: `不支持从 ${currentStatus} 流转到 ${nextStatus}`,
			});
		}

		await order.update({ status: nextStatus });

		return res.json({
			success: true,
			message: '订单状态更新成功',
			data: { order },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '更新订单状态失败',
			error: error.message,
		});
	}
});

// 订单中心：退款/售后备注
router.patch('/orders/:id/notes', async (req, res) => {
	try {
		await ensureOrderNoteTable();

		const orderId = Number(req.params.id);
		if (!Number.isInteger(orderId) || orderId <= 0) {
			return res.status(400).json({ success: false, message: '无效的订单ID' });
		}

		const order = await Order.findByPk(orderId);
		if (!order) {
			return res.status(404).json({ success: false, message: '订单不存在' });
		}

		const refundNote = req.body?.refundNote;
		const afterSaleNote = req.body?.afterSaleNote;

		if (refundNote === undefined && afterSaleNote === undefined) {
			return res.status(400).json({
				success: false,
				message: '请至少提供一种备注内容',
			});
		}

		const saveNote = async (type, note) => {
			const clean = String(note || '').trim();
			const existing = await OrderAdminNote.findOne({
				where: { orderId, type },
			});

			if (existing) {
				await existing.update({
					note: clean,
					operatorId: req.user?.id || null,
				});
				return;
			}

			await OrderAdminNote.create({
				orderId,
				type,
				note: clean,
				operatorId: req.user?.id || null,
			});
		};

		if (refundNote !== undefined) {
			await saveNote('refund', refundNote);
		}
		if (afterSaleNote !== undefined) {
			await saveNote('after_sale', afterSaleNote);
		}

		const notes = await OrderAdminNote.findAll({
			where: { orderId },
			raw: true,
		});

		const payload = {
			refundNote: '',
			afterSaleNote: '',
			updatedAt: null,
		};

		for (const note of notes) {
			if (note.type === 'refund') payload.refundNote = note.note || '';
			if (note.type === 'after_sale') payload.afterSaleNote = note.note || '';
			if (!payload.updatedAt || new Date(note.updatedAt) > new Date(payload.updatedAt)) {
				payload.updatedAt = note.updatedAt;
			}
		}

		return res.json({
			success: true,
			message: '备注保存成功',
			data: { serviceNotes: payload },
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: '保存订单备注失败',
			error: error.message,
		});
	}
});

module.exports = router;
