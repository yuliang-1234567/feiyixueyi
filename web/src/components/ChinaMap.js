import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import "./ChinaMap.css";

const ChinaMap = ({ onProvinceClick }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const onProvinceClickRef = useRef(onProvinceClick);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const initialViewRef = useRef({
    zoom: 1.7,
    center: [105, 36],
  });

  const HINT_KEY = "feiyixueyi:chinaMapHintSeen:v1";

  // 使用ref保存最新的回调函数，避免重新渲染
  useEffect(() => {
    onProvinceClickRef.current = onProvinceClick;
  }, [onProvinceClick]);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化ECharts实例
    const chartInstance = echarts.init(chartRef.current);
    chartInstanceRef.current = chartInstance;

    // 响应式调整函数
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };

    // 加载中国地图数据（从本地 public/json 目录）
    const loadChinaMap = async () => {
      try {
        // 从本地静态资源加载地图数据
        const response = await fetch('/json/100000_full.json');
        if (!response.ok) {
          throw new Error('地图数据加载失败');
        }
        const geoJson = await response.json();
        
        // 注册地图数据
        echarts.registerMap('china', geoJson);
        setMapLoaded(true);

        // 配置地图选项
        const option = {
          geo: {
            map: "china",
            roam: true,
            zoom: initialViewRef.current.zoom,
            center: initialViewRef.current.center,
            itemStyle: {
              // 纸感底色 + 暖边界（避免“默认工业灰”）
              areaColor: "#F7F3EC",
              borderColor: "rgba(139, 111, 71, 0.55)",
              borderWidth: 1,
              shadowColor: "rgba(44, 36, 22, 0.10)",
              shadowBlur: 8,
              shadowOffsetY: 2,
            },
            emphasis: {
              itemStyle: {
                // “印章点睛”：轻填充 + 边界加深 + 微光晕
                areaColor: "rgba(200, 16, 46, 0.18)",
                borderColor: "rgba(200, 16, 46, 0.75)",
                borderWidth: 2,
                shadowColor: "rgba(200, 16, 46, 0.20)",
                shadowBlur: 14,
              },
              label: {
                show: true,
                color: "#2c2416",
                fontSize: 13,
                fontWeight: "700",
              },
            },
            label: {
              show: false,
            },
          },
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(254, 252, 248, 0.96)",
            borderColor: "rgba(139, 111, 71, 0.30)",
            borderWidth: 1,
            textStyle: {
              color: "#2c2416",
              fontSize: 12,
            },
            padding: [10, 12],
            formatter: function (params) {
              if (!params.name) return "";
              return `
                <div style="font-weight: 800; letter-spacing: .2px; margin-bottom: 4px;">${params.name}</div>
                <div style="color: rgba(44,36,22,.72);">点击查看该省非遗</div>
              `;
            },
          },
          series: [],
        };

        chartInstance.setOption(option);

        // 首次提示：缩放/拖动
        try {
          const seen = window.localStorage.getItem(HINT_KEY);
          if (!seen) setShowHint(true);
        } catch {
          setShowHint(true);
        }

        const markHintSeen = () => {
          setShowHint(false);
          try {
            window.localStorage.setItem(HINT_KEY, "1");
          } catch {
            // ignore
          }
        };

        // 处理地图点击事件 - 使用ref来调用最新的回调函数
        chartInstance.on("click", (params) => {
          markHintSeen();
          console.log("地图点击事件触发:", params);
          if (params.name && onProvinceClickRef.current) {
            console.log("调用onProvinceClick:", params.name);
            onProvinceClickRef.current(params.name);
          }
        });

        // 任何 roam 行为都视为已知晓提示
        chartInstance.on("georoam", () => {
          markHintSeen();
        });

        // 添加响应式调整监听
        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('地图数据加载失败:', error);
        // 显示错误提示
        const option = {
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '地图加载失败，请刷新页面重试',
              fontSize: 16,
              fill: '#999'
            }
          }
        };
        chartInstance.setOption(option);
      }
    };

    loadChinaMap();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []); // 移除onProvinceClick依赖，只在组件挂载时执行一次

  const handleResetView = () => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.setOption({
      geo: {
        zoom: initialViewRef.current.zoom,
        center: initialViewRef.current.center,
      },
    });
    chart.dispatchAction({ type: "hideTip" });
  };

  return (
    <div className="china-map-container">
      <div ref={chartRef} className="china-map-chart" />
      {!mapLoaded && (
        <div className="china-map-loading">地图加载中...</div>
      )}
      {mapLoaded && (
        <div className="china-map-controls" aria-label="地图控件">
          <button
            type="button"
            className="china-map-controlBtn"
            onClick={handleResetView}
          >
            重置视角
          </button>
          {showHint && (
            <div className="china-map-hint" role="note">
              支持拖动与滚轮缩放，点击省份查看详情
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChinaMap;
