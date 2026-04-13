import React, { useState, useEffect } from "react";
import "./Carousel.css";

// 二十四节气名称映射
const SOLAR_TERMS = [
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
];

// 生成图片列表
const generateImageList = () => {
  const images = [];
  for (let i = 1; i <= 24; i++) {
    const index = i - 1;
    images.push({
      id: i,
      src: `/images/categories/categories${String(i).padStart(3, "0")}.jpg`,
      title: SOLAR_TERMS[index],
      fullTitle: `${SOLAR_TERMS[index]}・${getPaintingName(
        SOLAR_TERMS[index]
      )}`,
      source: "中国非物质文化遗产保护中心",
      author: "丁鼎",
      createTime: "2025.03.26",
    });
  }
  return images;
};

// 根据节气名称获取画作名称（示例）
const getPaintingName = (term) => {
  const paintingNames = {
    小寒: "水仙",
    大寒: "兰花",
    立春: "迎春花",
    雨水: "玉兰花",
    惊蛰: "黄鹂桃花",
    春分: "燕归来",
    清明: "杜鹃杏花图",
    谷雨: "牡丹图",
    立夏: "紫藤花",
    小满: "虞美人",
    芒种: "栀子花",
    夏至: "蜀葵",
    小暑: "凌霄花",
    大暑: "荷花",
    立秋: "雪兰花",
    处暑: "玉簪花",
    白露: "桂花红耳鹎",
    秋分: "木芙蓉",
    寒露: "秋菊",
    霜降: "红柿",
    立冬: "山雀啄山楂",
    小雪: "山茶花",
    大雪: "腊梅",
    冬至: "瑞香鸫语",
  };
  return paintingNames[term] || "国画";
};

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images] = useState(generateImageList());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalImages = images.length;
  const currentImage = images[currentIndex];

  // 计算要显示的缩略图范围（始终显示5个，选中项居中，循环展示）
  const getVisibleThumbnails = () => {
    const visibleCount = 5;
    const halfCount = Math.floor(visibleCount / 2);
    const indices = [];

    // 循环获取5个缩略图的索引（选中项居中）
    for (let i = -halfCount; i <= halfCount; i++) {
      let index = currentIndex + i;
      // 循环处理：如果超出范围，从另一端开始
      if (index < 0) {
        index = totalImages + index; // 负数时从末尾开始
      } else if (index >= totalImages) {
        index = index - totalImages; // 超出时从头开始
      }
      indices.push(index);
    }

    return indices;
  };

  // 切换到上一张
  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // 切换到下一张
  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // 跳转到指定图片
  const goToImage = (index) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, isTransitioning]);

  // 自动播放
  useEffect(() => {
    const autoPlayInterval = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(autoPlayInterval);
  }, [currentIndex]);

  return (
    <div className="carousel-container">
      {/* 顶部元数据 */}
      <div className="carousel-metadata">
        <h2 className="carousel-main-title">二十四节气·国画</h2>
        <div className="carousel-meta-info">
          <div className="meta-item">
            <span className="meta-label">来源:</span>
            <span className="meta-value">{currentImage.source}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">作者:</span>
            <span className="meta-value">{currentImage.author}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">创建时间:</span>
            <span className="meta-value">{currentImage.createTime}</span>
          </div>
        </div>
      </div>

      {/* 主图片展示区 */}
      <div className="carousel-main-display">
        <div
          className="carousel-image-wrapper"
          style={{
            backgroundImage: `url(${
              process.env.PUBLIC_URL || ""
            }/images/categories/background.jpg)`,
          }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.fullTitle}
            className={`carousel-main-image ${
              isTransitioning ? "transitioning" : ""
            }`}
            loading="eager"
            onError={(e) => {
              console.error(
                "图片加载失败:",
                currentImage.src,
                "尝试的路径:",
                e.target.src
              );
              // 不隐藏图片，保持显示以便调试
            }}
          />

          {/* 导航箭头 */}
          <div
            className="carousel-nav-button carousel-nav-prev"
            onClick={goToPrevious}
            role="button"
            tabIndex={0}
            aria-label="上一张"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToPrevious();
              }
            }}
            style={{
              backgroundImage: "url(/images/categories/leftAndRight.png)",
              backgroundPosition: "left center",
            }}
          ></div>
          <div
            className="carousel-nav-button carousel-nav-next"
            onClick={goToNext}
            role="button"
            tabIndex={0}
            aria-label="下一张"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToNext();
              }
            }}
            style={{
              backgroundImage: "url(/images/categories/leftAndRight.png)",
              backgroundPosition: "right center",
            }}
          ></div>

          {/* 图片标题 */}
          <div className="carousel-image-title">{currentImage.fullTitle}</div>

          {/* 页码指示 */}
          <div className="carousel-page-indicator">
            {currentIndex + 1}/{totalImages}
          </div>
        </div>
      </div>

      {/* 缩略图导航区 */}
      <div className="carousel-thumbnails">
        <div className="carousel-thumbnails-scroll">
          {getVisibleThumbnails().map((index) => {
            const image = images[index];
            return (
              <div
                key={`thumbnail-${index}-${image.id}`}
                className={`carousel-thumbnail ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => goToImage(index)}
              >
                <img
                  src={image.src}
                  alt={image.fullTitle}
                  className="carousel-thumbnail-image"
                  onError={(e) => {
                    console.error("缩略图加载失败:", image.src);
                    // 不隐藏图片，保持显示以便调试
                  }}
                />
                {index === currentIndex && (
                  <div
                    className="carousel-thumbnail-border"
                    style={{
                      backgroundImage: "url(/images/categories/selectBg.png)",
                    }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
