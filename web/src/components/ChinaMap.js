import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import './ChinaMap.css';

const ChinaMap = ({ onProvinceClick }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const onProvinceClickRef = useRef(onProvinceClick);
  const [mapLoaded, setMapLoaded] = useState(false);

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
            map: 'china',
            roam: true, // 开启缩放和平移
            zoom: 1.2,
            itemStyle: {
              areaColor: '#f0f0f0',
              borderColor: '#999',
              borderWidth: 1
            },
            emphasis: {
              itemStyle: {
                areaColor: '#c8102e',
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold'
              }
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: function(params) {
              if (params.name) {
                return `<div style="font-weight: bold;">${params.name}</div><div>点击查看详情</div>`;
              }
              return '';
            }
          },
          series: []
        };

        chartInstance.setOption(option);

        // 处理地图点击事件 - 使用ref来调用最新的回调函数
        chartInstance.on('click', (params) => {
          console.log('地图点击事件触发:', params);
          if (params.name && onProvinceClickRef.current) {
            console.log('调用onProvinceClick:', params.name);
            onProvinceClickRef.current(params.name);
          }
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

  return (
    <div className="china-map-container">
      <div ref={chartRef} className="china-map-chart" />
      {!mapLoaded && (
        <div className="china-map-loading">地图加载中...</div>
      )}
    </div>
  );
};

export default ChinaMap;
