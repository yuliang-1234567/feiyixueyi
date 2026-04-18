import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

const getCssVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const buildAdminTheme = () => {
  const colorPrimary = getCssVar('--primary-color', '#8b6f47');
  const colorError = getCssVar('--accent-color', '#c8102e');
  const colorBgLayout = getCssVar('--bg-secondary', '#faf9f6');
  const colorBgContainer = getCssVar('--bg-paper', '#fefcf8');
  const colorBorder = getCssVar('--border-color', '#e8e0d6');
  const colorText = getCssVar('--text-primary', '#2c2416');
  const colorTextSecondary = getCssVar('--text-secondary', '#5a4a3a');
  const fontFamily = getCssVar(
    '--font-family',
    "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
  );

  const radiusMd = getCssVar('--apple-radius-md', '8px').replace('px', '');
  const borderRadius = toNumber(radiusMd, 8);

  return {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorPrimary,
      colorError,
      colorText,
      colorTextSecondary,
      colorBgLayout,
      colorBgContainer,
      colorBorder,
      fontFamily,
      borderRadius,
      wireframe: false,
    },
    components: {
      Layout: {
        bodyBg: colorBgLayout,
        headerBg: 'transparent',
        siderBg: '#141414',
      },
      Menu: {
        itemBorderRadius: Math.max(6, borderRadius),
      },
      Card: {
        borderRadiusLG: Math.max(10, borderRadius + 2),
      },
      Table: {
        headerBg: 'rgba(139, 111, 71, 0.06)',
        headerColor: colorText,
        borderColor: colorBorder,
      },
      Button: {
        borderRadius: Math.max(8, borderRadius),
      },
      Input: {
        borderRadius: Math.max(8, borderRadius),
      },
      Select: {
        borderRadius: Math.max(8, borderRadius),
      },
      Modal: {
        borderRadiusLG: Math.max(12, borderRadius + 4),
      },
    },
  };
};

export default function AdminThemeProvider({ children }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // 允许在字体/主题变量异步加载后重新计算一次 token（例如字体加载完成）
    const t = window.setTimeout(() => setVersion((v) => v + 1), 0);
    return () => window.clearTimeout(t);
  }, []);

  const theme = useMemo(() => buildAdminTheme(), [version]);

  return (
    <ConfigProvider theme={theme}>
      {children}
    </ConfigProvider>
  );
}

