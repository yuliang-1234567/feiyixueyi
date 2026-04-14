import React from "react";

/**
 * Lucide 图标统一规范：
 * - 颜色跟随 currentColor
 * - 默认尺寸 18px，strokeWidth 1.75（更接近“宋韵雅致”的克制细线）
 */
export function LucideIcon({
  icon: Icon,
  size = 18,
  strokeWidth = 1.75,
  className,
  ...rest
}) {
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

