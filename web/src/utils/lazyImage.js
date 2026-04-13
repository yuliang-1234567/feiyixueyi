/**
 * 图片懒加载工具
 * 使用IntersectionObserver实现图片懒加载
 */
import { useState, useEffect } from 'react';

/**
 * 初始化图片懒加载
 * @param {string} selector - 图片选择器，默认 'img[data-src]'
 */
export const initLazyImages = (selector = 'img[data-src]') => {
  const images = document.querySelectorAll(selector);
  
  if (!('IntersectionObserver' in window)) {
    // 不支持IntersectionObserver，直接加载所有图片
    images.forEach((img) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          // 创建新的Image对象预加载
          const imageLoader = new Image();
          imageLoader.onload = () => {
            img.src = img.dataset.src;
            img.classList.add('lazy-loaded');
            img.removeAttribute('data-src');
          };
          imageLoader.onerror = () => {
            img.src = '/placeholder.jpg'; // 加载失败时使用占位图
            img.classList.add('lazy-error');
          };
          imageLoader.src = img.dataset.src;
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px', // 提前50px开始加载
  });

  images.forEach((img) => {
    // 设置占位符
    if (!img.src) {
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3C/svg%3E';
      img.style.backgroundColor = '#f0f0f0';
    }
    imageObserver.observe(img);
  });
};

/**
 * React Hook for lazy loading images
 */
export const useLazyImage = (src, placeholder) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
      setImageSrc(placeholder || '/placeholder.jpg');
    };
    img.src = src;
  }, [src, placeholder]);

  return { imageSrc, isLoaded, hasError };
};

