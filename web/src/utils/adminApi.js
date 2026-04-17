import api from './api';

const adminApi = {
	getOverview: async () => {
		const response = await api.get('/admin/overview');
		return response.data;
	},

	getDashboardP1: async () => {
		const response = await api.get('/admin/dashboard/p1');
		return response.data;
	},

	getAiMonitorOverview: async (params = {}) => {
		const response = await api.get('/admin/ai-monitor/overview', {
			params,
		});
		return response.data;
	},

	getUsers: async (params = {}) => {
		const response = await api.get('/admin/users', {
			params: {
				page: params.page || 1,
				limit: params.limit || 10,
			},
		});
		return response.data;
	},

	createUser: async (payload) => {
		const response = await api.post('/admin/users', payload);
		return response.data;
	},

	deleteUser: async (id) => {
		const response = await api.delete(`/admin/users/${id}`);
		return response.data;
	},

	getArtworks: async (params = {}) => {
		const response = await api.get('/admin/artworks', {
			params,
		});
		return response.data;
	},

	updateArtworkStatus: async (id, status) => {
		const response = await api.patch(`/admin/artworks/${id}/status`, { status });
		return response.data;
	},

	deleteArtwork: async (id) => {
		const response = await api.delete(`/admin/artworks/${id}`);
		return response.data;
	},

	getArtworkFavorites: async (params = {}) => {
		const response = await api.get('/admin/favorites/artworks', {
			params,
		});
		return response.data;
	},

	getQuizFavorites: async (params = {}) => {
		const response = await api.get('/admin/favorites/quiz', {
			params,
		});
		return response.data;
	},

	getProducts: async (params = {}) => {
		const response = await api.get('/admin/products', {
			params,
		});
		return response.data;
	},

	getOrders: async (params = {}) => {
		const response = await api.get('/admin/orders', {
			params,
		});
		return response.data;
	},

	updateOrderStatus: async (id, status) => {
		const response = await api.patch(`/admin/orders/${id}/status`, { status });
		return response.data;
	},

	updateOrderNotes: async (id, payload) => {
		const response = await api.patch(`/admin/orders/${id}/notes`, payload);
		return response.data;
	},

	getProductDetail: async (id) => {
		const response = await api.get(`/admin/products/${id}`);
		return response.data;
	},

	updateProduct: async (id, payload) => {
		const response = await api.put(`/admin/products/${id}`, payload);
		return response.data;
	},

	deleteProduct: async (id) => {
		const response = await api.delete(`/admin/products/${id}`);
		return response.data;
	},

	batchUpdateProducts: async (payload) => {
		const response = await api.patch('/admin/products/batch', payload);
		return response.data;
	},

	offlineProduct: async (id, reason) => {
		const response = await api.patch(`/admin/products/${id}/violation/offline`, {
			reason,
		});
		return response.data;
	},

	reviewProduct: async (id, decision, reason) => {
		const response = await api.patch(`/admin/products/${id}/review`, {
			decision,
			reason,
		});
		return response.data;
	},
};

export default adminApi;
