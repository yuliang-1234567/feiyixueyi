import React, { useEffect, useRef } from 'react';
import './AIVisualization.css';

/**
 * AI 可视化组件
 * 绘制边缘线稿、特征点、结构分析高亮
 */
const AIVisualization = ({ 
  imageUrl, 
  className = '',
  showEdges = true,
  showFeaturePoints = true,
  showStructure = true
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // 设置画布尺寸
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 绘制边缘线稿
    const drawEdges = (imageData) => {
      const width = canvas.width;
      const height = canvas.height;
      const data = imageData.data;
      const edgeData = new Uint8ClampedArray(data.length);

      // Sobel 边缘检测算法
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // 获取周围像素的灰度值
          const getGray = (x, y) => {
            const i = (y * width + x) * 4;
            return (data[i] + data[i + 1] + data[i + 2]) / 3;
          };

          const gx = 
            -getGray(x - 1, y - 1) + getGray(x + 1, y - 1) +
            -2 * getGray(x - 1, y) + 2 * getGray(x + 1, y) +
            -getGray(x - 1, y + 1) + getGray(x + 1, y + 1);

          const gy =
            -getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1) +
            getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1);

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const edgeValue = Math.min(255, magnitude * 2);

          edgeData[idx] = edgeValue;
          edgeData[idx + 1] = edgeValue;
          edgeData[idx + 2] = edgeValue;
          edgeData[idx + 3] = 255;
        }
      }

      const edgeImageData = new ImageData(edgeData, width, height);
      ctx.putImageData(edgeImageData, 0, 0);
    };

    // 绘制特征点
    const drawFeaturePoints = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // 模拟特征点（实际应该从AI分析结果获取）
      const featurePoints = [];
      for (let i = 0; i < 20; i++) {
        featurePoints.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 4 + 2
        });
      }

      ctx.fillStyle = '#5cc8ff';
      ctx.strokeStyle = '#5cc8ff';
      ctx.lineWidth = 1;

      featurePoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    };

    // 绘制结构分析高亮
    const drawStructureHighlight = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // 模拟结构区域（实际应该从AI分析结果获取）
      const regions = [
        { x: width * 0.2, y: height * 0.3, w: width * 0.3, h: height * 0.4 },
        { x: width * 0.6, y: height * 0.2, w: width * 0.25, h: height * 0.5 }
      ];

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      regions.forEach(region => {
        ctx.strokeRect(region.x, region.y, region.w, region.h);
      });

      ctx.setLineDash([]);
    };

    // 图片加载状态
    let imageLoaded = false;
    let imageLoadError = false;
    let animationRunning = !imageUrl; // 没有图片时运行动画

    // 图片加载处理（在动画循环外部）
    if (imageUrl) {
      // 先设置事件处理器
      img.onload = () => {
        imageLoaded = true;
        imageLoadError = false;
        
        // 绘制一次（静态显示）
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制原图（半透明）
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;

        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 绘制边缘线稿
        if (showEdges) {
          drawEdges(imageData);
        }
        
        // 绘制特征点
        if (showFeaturePoints) {
          drawFeaturePoints();
        }
        
        // 绘制结构高亮
        if (showStructure) {
          drawStructureHighlight();
        }
        
        // 图片加载后停止动画循环
        animationRunning = false;
      };

      img.onerror = () => {
        imageLoadError = true;
        imageLoaded = false;
        animationRunning = true; // 加载失败时继续动画
      };

      // 开始加载图片
      if (img.complete && img.naturalWidth > 0) {
        // 图片已缓存，直接触发 onload
        img.onload();
      } else {
        img.src = imageUrl;
      }
    }

    // 动画循环（仅在没有图片或图片加载失败时运行）
    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime) => {
      // 如果图片已加载成功，停止动画
      if (imageLoaded && !imageLoadError) {
        return;
      }

      // 限制帧率
      if (currentTime - lastTime < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      // 没有图片或图片加载失败时显示占位动画
      if (!imageUrl || imageLoadError) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景渐变
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(139, 111, 71, 0.05)');
        gradient.addColorStop(1, 'rgba(107, 93, 79, 0.05)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制加载动画（旋转的圆环）
        const time = currentTime * 0.001;
        ctx.strokeStyle = '#8b6f47';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          Math.min(canvas.width, canvas.height) * 0.15,
          time * 2,
          time * 2 + Math.PI * 1.5
        );
        ctx.stroke();
        
        // 绘制中心点
        ctx.fillStyle = '#8b6f47';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // 启动动画循环（如果没有图片或图片加载失败）
    if (animationRunning) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      animationRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageUrl, showEdges, showFeaturePoints, showStructure]);

  return (
    <div className={`ai-visualization-container ${className}`}>
      <canvas ref={canvasRef} className="ai-visualization-canvas" />
    </div>
  );
};

export default AIVisualization;
