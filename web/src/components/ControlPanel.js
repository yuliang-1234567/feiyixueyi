import React from 'react';
import { Button, Input, Select } from 'antd';
import { Wand2 } from 'lucide-react';
import './ControlPanel.css';

function ControlPanel({
  styleOptions,
  styleKey,
  onStyleKeyChange,
  customStylePrompt,
  onCustomStylePromptChange,
  canGenerate,
  loading,
  onGenerate,
}) {
  return (
    <div className="controlPanel">
      <div className="controlPanel-section">
        <div className="controlPanel-label">非遗风格</div>
        <Select
          value={styleKey}
          onChange={(v) => onStyleKeyChange?.(v)}
          options={styleOptions}
          placeholder="选择非遗类型"
          size="middle"
        />
      </div>

      {styleKey === 'custom' ? (
        <div className="controlPanel-section">
          <div className="controlPanel-label">自定义风格（可选补充prompt）</div>
          <Input
            value={customStylePrompt}
            onChange={(e) => onCustomStylePromptChange?.(e.target.value)}
            placeholder="例如：保留剪纸线稿的对称结构 + 浅红釉色氛围 + 空灵留白..."
          />
        </div>
      ) : null}

      <div className="controlPanel-actions">
        <Button
          type="primary"
          icon={<Wand2 size={16} />}
          block
          size="large"
          disabled={!canGenerate}
          loading={loading}
          onClick={onGenerate}
          className="controlPanel-generateBtn"
        >
          生成
        </Button>
        <div className="controlPanel-hint">
          {canGenerate
            ? '你已经完成草图：点击生成获取 1 张效果图。'
            : '请先在左侧画布完成草图，再解锁生成按钮。'}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;

