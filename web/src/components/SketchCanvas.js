import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { Trash2 } from 'lucide-react';
import './SketchCanvas.css';

const CANVAS_SIZE = 512;

const SketchCanvas = forwardRef(function SketchCanvas(
  { onHasDrawingChange },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [hasDrawing, setHasDrawing] = useState(false);

  const strokeStyle = useMemo(() => '#111827', []);

  const setDrawingState = (next) => {
    setHasDrawing(next);
    onHasDrawingChange?.(Boolean(next));
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeStyle;

    // 默认白底，避免透明背景导致模型抓取不稳定
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    lastPointRef.current = { x: 0, y: 0 };
    setDrawingState(false);
  };

  const getCanvasPointFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const drawLine = (from, to) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  useEffect(() => {
    initCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    exportBase64: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.error('导出base64失败:', e);
        return null;
      }
    },
    clear: () => clearCanvas(),
    getHasDrawing: () => hasDrawing,
  }));

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();

    isDrawingRef.current = true;
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
    drawLine(last, p);
    lastPointRef.current = p;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handlePointerUp = (e) => {
    stopDrawing();
    const canvas = canvasRef.current;
    try {
      canvas?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerCancel = () => stopDrawing();

  return (
    <div className="sketch-canvasWrap">
      <div className="sketch-canvasFrame">
        <canvas
          ref={canvasRef}
          className="sketch-canvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={stopDrawing}
          onPointerCancel={handlePointerCancel}
          aria-label="草图绘制画布"
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

