import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';

const getCssVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const useChartTheme = () => {
  return useMemo(() => {
    const primary = getCssVar('--primary-color', '#8b6f47');
    const accent = getCssVar('--accent-color', '#c8102e');
    const gold = getCssVar('--gold', '#d4af37');
    const aiBlue = getCssVar('--ai-blue', '#5cc8ff');
    const text = getCssVar('--text-primary', '#2c2416');
    const textSecondary = getCssVar('--text-secondary', '#5a4a3a');
    const border = getCssVar('--border-color', '#e8e0d6');
    const bg = getCssVar('--bg-paper', '#fefcf8');
    const fontFamily = getCssVar(
      '--font-family',
      "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
    );

    return {
      colors: [primary, aiBlue, gold, accent, '#34C759', '#FF9500', '#5856D6', '#AF52DE'],
      text,
      textSecondary,
      border,
      bg,
      fontFamily,
    };
  }, []);
};

export const buildEChartBaseOption = (t) => ({
  color: t.colors,
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: t.fontFamily,
    color: t.text,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(254, 252, 248, 0.96)',
    borderColor: 'rgba(139, 111, 71, 0.28)',
    borderWidth: 1,
    textStyle: { color: t.text, fontSize: 12 },
    padding: [10, 12],
  },
  grid: { left: 36, right: 18, top: 28, bottom: 32, containLabel: true },
});

export const buildLineOption = ({ title, xAxis, series }) => (t) => ({
  ...buildEChartBaseOption(t),
  title: title
    ? { text: title, left: 0, top: 0, textStyle: { fontSize: 12, fontWeight: 700, color: t.textSecondary } }
    : undefined,
  xAxis: {
    type: 'category',
    data: xAxis,
    boundaryGap: false,
    axisLine: { lineStyle: { color: t.border } },
    axisLabel: { color: t.textSecondary, fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { color: t.textSecondary, fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(139, 111, 71, 0.12)' } },
  },
  series: (series || []).map((s) => ({
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: false,
    lineStyle: { width: 3 },
    areaStyle: { opacity: 0.10 },
    ...s,
  })),
});

export const buildBarOption = ({ title, xAxis, series }) => (t) => ({
  ...buildEChartBaseOption(t),
  title: title
    ? { text: title, left: 0, top: 0, textStyle: { fontSize: 12, fontWeight: 700, color: t.textSecondary } }
    : undefined,
  xAxis: {
    type: 'category',
    data: xAxis,
    axisLine: { lineStyle: { color: t.border } },
    axisLabel: { color: t.textSecondary, fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { color: t.textSecondary, fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(139, 111, 71, 0.12)' } },
  },
  series: (series || []).map((s) => ({
    type: 'bar',
    barWidth: 18,
    itemStyle: { borderRadius: [6, 6, 2, 2] },
    ...s,
  })),
});

export const buildFunnelOption = ({ title, data }) => (t) => ({
  color: t.colors,
  title: title
    ? { text: title, left: 0, top: 0, textStyle: { fontSize: 12, fontWeight: 700, color: t.textSecondary } }
    : undefined,
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(254, 252, 248, 0.96)',
    borderColor: 'rgba(139, 111, 71, 0.28)',
    borderWidth: 1,
    textStyle: { color: t.text, fontSize: 12 },
    padding: [10, 12],
    formatter: '{b}: {c}',
  },
  series: [
    {
      type: 'funnel',
      left: 0,
      right: 0,
      top: 24,
      bottom: 6,
      min: 0,
      sort: 'descending',
      gap: 6,
      label: {
        color: t.text,
        fontSize: 12,
        fontWeight: 700,
      },
      labelLine: { lineStyle: { color: 'rgba(44, 36, 22, 0.25)' } },
      itemStyle: { borderColor: 'rgba(254, 252, 248, 0.70)', borderWidth: 1 },
      emphasis: { label: { fontSize: 12 } },
      data: (data || []).map((d) => ({ ...d, value: Number(d.value || 0) })),
    },
  ],
});

export default function EChart({
  optionFactory,
  height = 260,
  style,
  onReady,
  ariaLabel = '图表',
}) {
  const t = useChartTheme();
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const inst = echarts.init(containerRef.current);
    chartRef.current = inst;

    const resize = () => inst.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      inst.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const inst = chartRef.current;
    if (!inst) return;
    const opt = typeof optionFactory === 'function' ? optionFactory(t) : optionFactory;
    inst.setOption(opt || {}, { notMerge: true, lazyUpdate: true });
    if (typeof onReady === 'function') onReady(inst);
  }, [optionFactory, onReady, t]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height, ...style }}
    />
  );
}

