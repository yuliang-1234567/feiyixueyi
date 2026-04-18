import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Button, Slider, message } from 'antd';
import { Brush, CornerUpLeft, CornerUpRight, Eraser, Trash2 } from 'lucide-react';
import './SketchCanvas.css';

const CANVAS_SIZE = 512;
const HISTORY_LIMIT = 40;
const DEFAULT_BRUSH_SIZE = 6;
const DEFAULT_BRUSH_COLOR = '#111827';
const BRUSH_SIZE_RANGE = { min: 2, max: 24 };
const PRESET_COLORS = ['#111827', '#ef4444', '#2563eb', '#16a34a', '#8b5e34'];

const SketchCanvas = forwardRef(function SketchCanvas(
  { onHasDrawingChange, backgroundImageUrl },
  ref
) {
  const bgCanvasRef = useRef(null);
  const bgCtxRef = useRef(null);
  const strokesCanvasRef = useRef(null);
  const strokesCtxRef = useRef(null);
  const backgroundUrlRef = useRef('');

  const exportCanvasRef = useRef(null); // 离屏合成导出（底图+笔触）

  const isDrawingRef = useRef(false);
  const didDrawRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  /** 串行化所有还原操作，避免并发 decode/绘制导致偶发未还原 */
  const restoreChainRef = useRef(Promise.resolve());

  const [hasDrawing, setHasDrawing] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [tool, setTool] = useState('brush'); // 'brush' | 'eraser'
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [brushColor, setBrushColor] = useState(DEFAULT_BRUSH_COLOR);

  const setDrawingState = (next) => {
    setHasDrawing(next);
    onHasDrawingChange?.(Boolean(next));
  };

  const bumpHistoryTick = () => setHistoryTick((x) => x + 1);

  const clearCanvasToTransparent = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawWhiteBackground = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const snapshotStrokes = () => {
    const canvas = strokesCanvasRef.current;
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const drawBackgroundImage = async (url) => {
    const canvas = bgCanvasRef.current;
    const ctx = bgCtxRef.current;
    if (!canvas || !ctx) return;

    const normalized = String(url || '').trim();
    backgroundUrlRef.current = normalized;

    drawWhiteBackground(ctx, canvas);
    if (!normalized) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = normalized;
    });
    if (!loaded) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const scale = Math.min(cw / iw, ch / ih);
    const dw = Math.floor(iw * scale);
    const dh = Math.floor(ih * scale);
    const dx = Math.floor((cw - dw) / 2);
    const dy = Math.floor((ch - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  const restoreStrokesFromDataUrl = async (dataUrl) => {
    const strokesCanvas = strokesCanvasRef.current;
    const strokesCtx = strokesCtxRef.current;
    if (!strokesCanvas || !strokesCtx) return false;
    const url = String(dataUrl || '').trim();
    if (!url) return false;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const loaded = await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
      if (!loaded) return false;
      try {
        if (typeof img.decode === 'function') await img.decode();
      } catch {
        // ignore
      }
      strokesCtx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      strokesCtx.drawImage(img, 0, 0, strokesCanvas.width, strokesCanvas.height);
      return true;
    } catch {
      return false;
    }
  };

  const pushHistory = () => {
    const shot = snapshotStrokes();
    if (!shot) return;
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    const next = stack.slice(0, idx + 1);
    // 避免重复快照导致“上一步/下一步”看似不生效
    const last = next[next.length - 1];
    if (last && last === shot) return;
    next.push(shot);
    if (next.length > HISTORY_LIMIT) {
      next.splice(0, next.length - HISTORY_LIMIT);
    }
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    bumpHistoryTick();
  };

  const resetHistory = () => {
    const shot = snapshotStrokes();
    historyRef.current = shot ? [shot] : [];
    historyIndexRef.current = shot ? 0 : -1;
    bumpHistoryTick();
  };

  const initCanvas = () => {
    const bgCanvas = bgCanvasRef.current;
    const strokesCanvas = strokesCanvasRef.current;
    if (!bgCanvas || !strokesCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const strokesCtx = strokesCanvas.getContext('2d');
    if (!bgCtx || !strokesCtx) return;

    bgCtxRef.current = bgCtx;
    strokesCtxRef.current = strokesCtx;

    drawWhiteBackground(bgCtx, bgCanvas);
    clearCanvasToTransparent(strokesCtx, strokesCanvas);

    strokesCtx.lineWidth = DEFAULT_BRUSH_SIZE;
    strokesCtx.lineCap = 'round';
    strokesCtx.lineJoin = 'round';
    strokesCtx.strokeStyle = DEFAULT_BRUSH_COLOR;
    strokesCtx.globalCompositeOperation = 'source-over';

    // 离屏导出画布
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = bgCanvas.width;
    exportCanvas.height = bgCanvas.height;
    exportCanvasRef.current = exportCanvas;
    resetHistory();
  };

  const clearCanvas = () => {
    const strokesCanvas = strokesCanvasRef.current;
    const strokesCtx = strokesCtxRef.current;
    if (strokesCanvas && strokesCtx) strokesCtx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    isDrawingRef.current = false;
    didDrawRef.current = false;
    lastPointRef.current = { x: 0, y: 0 };
    setDrawingState(false);
    setTimeout(() => resetHistory(), 0);
  };

  const scheduleRestore = (nextDataUrl, nextIdx) => {
    restoreChainRef.current = restoreChainRef.current
      .then(async () => {
        const ok = await restoreStrokesFromDataUrl(nextDataUrl);
        if (ok) {
          historyIndexRef.current = nextIdx;
          setDrawingState(nextIdx > 0);
          bumpHistoryTick();
        }
      })
      .catch(() => {});
  };

  const undo = () => {
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    if (!stack || stack.length <= 1 || idx <= 0) {
      message.info('已经是最初状态');
      return;
    }
    const nextIdx = idx - 1;
    scheduleRestore(stack[nextIdx], nextIdx);
  };

  const redo = () => {
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    if (!stack || stack.length <= 1 || idx >= stack.length - 1) {
      message.info('已经是最新状态');
      return;
    }
    const nextIdx = idx + 1;
    scheduleRestore(stack[nextIdx], nextIdx);
  };

  const getCanvasPointFromEvent = (e) => {
    const canvas = strokesCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const drawLine = (from, to) => {
    const strokesCtx = strokesCtxRef.current;
    if (!strokesCtx) return;
    strokesCtx.beginPath();
    strokesCtx.moveTo(from.x, from.y);
    strokesCtx.lineTo(to.x, to.y);
    strokesCtx.stroke();
  };

  useEffect(() => {
    initCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctx = strokesCtxRef.current;
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  }, [brushColor, brushSize, tool]);

  useEffect(() => {
    if (!bgCtxRef.current || !bgCanvasRef.current) return;
    const normalized = String(backgroundImageUrl || '').trim();
    if (normalized === backgroundUrlRef.current) return;

    // 背景图变更：重新绘制底图，并重置绘制状态（避免“迁移后直接可生成”）
    void drawBackgroundImage(normalized);
    const strokesCanvas = strokesCanvasRef.current;
    const strokesCtx = strokesCtxRef.current;
    if (strokesCanvas && strokesCtx) strokesCtx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    isDrawingRef.current = false;
    didDrawRef.current = false;
    lastPointRef.current = { x: 0, y: 0 };
    setDrawingState(false);
    setTimeout(() => resetHistory(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImageUrl]);

  useImperativeHandle(ref, () => ({
    exportBase64: () => {
      const exportCanvas = exportCanvasRef.current;
      const bgCanvas = bgCanvasRef.current;
      const strokesCanvas = strokesCanvasRef.current;
      if (!exportCanvas || !bgCanvas || !strokesCanvas) return null;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return null;
      try {
        // 合成：白底+底图，再叠加透明笔触
        drawWhiteBackground(ctx, exportCanvas);
        ctx.drawImage(bgCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(strokesCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        return exportCanvas.toDataURL('image/png');
      } catch (e) {
        console.error('导出base64失败:', e);
        return null;
      }
    },
    exportStrokesBase64: () => {
      const canvas = strokesCanvasRef.current;
      if (!canvas) return null;
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.error('导出笔触层base64失败:', e);
        return null;
      }
    },
    clear: () => clearCanvas(),
    getHasDrawing: () => hasDrawing,
    undo: () => undo(),
    redo: () => redo(),
    canUndo: () => {
      const idx = historyIndexRef.current;
      const stack = historyRef.current;
      return Boolean(stack && stack.length > 1 && idx > 0);
    },
    canRedo: () => {
      const idx = historyIndexRef.current;
      const stack = historyRef.current;
      return Boolean(stack && stack.length > 1 && idx >= 0 && idx < stack.length - 1);
    },
  }));

  const handlePointerDown = (e) => {
    const canvas = strokesCanvasRef.current;
    const ctx = strokesCtxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();

    isDrawingRef.current = true;
    didDrawRef.current = false;
    const p = getCanvasPointFromEvent(e);
    lastPointRef.current = p;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const p = getCanvasPointFromEvent(e);
    const last = lastPointRef.current;
    if (!hasDrawing) setDrawingState(true);
    didDrawRef.current = true;
    drawLine(last, p);
    lastPointRef.current = p;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handlePointerUp = (e) => {
    const hadDrawing = isDrawingRef.current;
    stopDrawing();
    const canvas = strokesCanvasRef.current;
    try {
      canvas?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    if (hadDrawing && didDrawRef.current) {
      pushHistory();
    }
    didDrawRef.current = false;
  };

  const handlePointerCancel = () => {
    const hadDrawing = isDrawingRef.current;
    stopDrawing();
    if (hadDrawing && didDrawRef.current) {
      pushHistory();
    }
    didDrawRef.current = false;
  };

  const handlePointerLeave = () => {
    const hadDrawing = isDrawingRef.current;
    stopDrawing();
    if (hadDrawing && didDrawRef.current) {
      pushHistory();
    }
    didDrawRef.current = false;
  };

  // 用 historyTick 触发重渲染，确保按钮禁用状态随历史变化刷新
  void historyTick;

  const canUndo = (() => {
    const idx = historyIndexRef.current;
    const stack = historyRef.current;
    return Boolean(stack && stack.length > 1 && idx > 0);
  })();

  const canRedo = (() => {
    const idx = historyIndexRef.current;
    const stack = historyRef.current;
    return Boolean(stack && stack.length > 1 && idx >= 0 && idx < stack.length - 1);
  })();

  return (
    <div className="sketch-canvasWrap">
      <div className="sketch-tools">
        <div className="sketch-toolGroup">
          <Button
            type={tool === 'brush' ? 'primary' : 'default'}
            icon={<Brush size={16} />}
            onClick={() => setTool('brush')}
            className="sketch-toolBtn"
          >
            画笔
          </Button>
          <Button
            type={tool === 'eraser' ? 'primary' : 'default'}
            icon={<Eraser size={16} />}
            onClick={() => setTool('eraser')}
            className="sketch-toolBtn"
          >
            橡皮擦
          </Button>
        </div>

        <div className="sketch-toolGroup sketch-toolGroup--grow">
          <div className="sketch-toolLabel">粗细</div>
          <Slider
            min={BRUSH_SIZE_RANGE.min}
            max={BRUSH_SIZE_RANGE.max}
            value={brushSize}
            onChange={setBrushSize}
            className="sketch-sizeSlider"
          />
          <div className="sketch-sizeValue">{brushSize}</div>
        </div>

        <div className="sketch-toolGroup">
          <div className="sketch-toolLabel">颜色</div>
          <div className="sketch-colorRow">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={c === brushColor ? 'sketch-colorDot sketch-colorDot--active' : 'sketch-colorDot'}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setBrushColor(c);
                  setTool('brush');
                }}
                aria-label={`选择颜色 ${c}`}
              />
            ))}
            <input
              className="sketch-colorPicker"
              type="color"
              value={brushColor}
              onChange={(e) => {
                setBrushColor(e.target.value);
                setTool('brush');
              }}
              aria-label="自定义颜色"
            />
          </div>
        </div>
      </div>

      <div className="sketch-canvasFrame">
        <canvas
          ref={bgCanvasRef}
          className="sketch-canvas sketch-bgCanvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          aria-label="产品底图画布"
          role="img"
        />
        <canvas
          ref={strokesCanvasRef}
          className="sketch-canvas sketch-strokesCanvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerCancel}
          aria-label="草图笔触画布"
          role="application"
        />

        {!hasDrawing ? (
          <div className="sketch-hint">
            在这里用鼠标/触控一笔成纹
          </div>
        ) : null}
      </div>

      <div className="sketch-actions">
        <Button
          icon={<CornerUpLeft size={16} />}
          onClick={() => void undo()}
          disabled={!canUndo}
          className="sketch-undoBtn"
        >
          上一步
        </Button>
        <Button
          icon={<CornerUpRight size={16} />}
          onClick={() => void redo()}
          disabled={!canRedo}
          className="sketch-undoBtn"
        >
          下一步
        </Button>
        <Button
          icon={<Trash2 size={16} />}
          onClick={() => {
            clearCanvas();
            message.info('已清空草图');
          }}
          className="sketch-clearBtn"
        >
          清空
        </Button>
      </div>
    </div>
  );
});

export default SketchCanvas;

