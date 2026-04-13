// 购物车工具类
const CART_KEY = 'shopping_cart';

export const cartUtils = {
  // 获取购物车
  getCart() {
    try {
      const cart = localStorage.getItem(CART_KEY);
      return cart ? JSON.parse(cart) : [];
    } catch (error) {
      console.error('获取购物车失败:', error);
      return [];
    }
  },

  // 保存购物车
  saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      return true;
    } catch (error) {
      console.error('保存购物车失败:', error);
      return false;
    }
  },

  // 添加到购物车
  addToCart(product, quantity = 1) {
    // 确保 product 是对象且有 id（避免误传事件对象等）
    if (!product || typeof product !== 'object' || product.id == null) {
      return this.getCart();
    }
    const cart = this.getCart();
    const existingItem = cart.find(item => item.id === product.id);

    // 取第一张图：支持 images 数组、pattern.imageUrl、imageUrl
    let image = '';
    if (Array.isArray(product.images) && product.images[0]) {
      image = product.images[0];
    } else if (typeof product.images === 'string' && product.images) {
      image = product.images;
    } else if (product.pattern?.imageUrl) {
      image = product.pattern.imageUrl;
    } else if (product.imageUrl) {
      image = product.imageUrl;
    }

    if (existingItem) {
      existingItem.quantity += quantity;
      if (image) existingItem.image = image; // 补充之前缺失的 image
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image,
        category: product.category,
        quantity: quantity,
        stock: product.stock
      });
    }

    this.saveCart(cart);
    return cart;
  },

  // 从购物车移除
  removeFromCart(productId) {
    const cart = this.getCart();
    const newCart = cart.filter(item => item.id !== productId);
    this.saveCart(newCart);
    return newCart;
  },

  // 更新数量
  updateQuantity(productId, quantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        return this.removeFromCart(productId);
      }
      item.quantity = quantity;
      this.saveCart(cart);
    }
    return cart;
  },

  // 清空购物车
  clearCart() {
    localStorage.removeItem(CART_KEY);
  },

  // 获取购物车总数
  getTotalCount() {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  },

  // 获取购物车总价
  getTotalPrice() {
    const cart = this.getCart();
    return cart.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return total + price * qty;
    }, 0);
  }
};

