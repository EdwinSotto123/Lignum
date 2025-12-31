import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { DrawingTool } from '../types';

interface CanvasProps {
  tool: DrawingTool;
}

export interface CanvasRef {
  getImageData: () => string;
  clear: () => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ tool }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  useImperativeHandle(ref, () => ({
    getImageData: () => {
      if (canvasRef.current) {
        // Create a white background behind the transparent canvas for better processing
        const canvas = canvasRef.current;
        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext('2d');
        if(!ctx) return "";

        // Copy current content
        const imageData = ctx.getImageData(0, 0, w, h);
        
        // Create temp canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if(!tempCtx) return "";

        // Fill white
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, w, h);
        // Draw original image on top
        tempCtx.drawImage(canvas, 0, 0);
        
        return tempCanvas.toDataURL('image/png');
      }
      return "";
    },
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }));

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        // Save current content
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        const savedData = ctx.getImageData(0,0, canvas.width, canvas.height);
        
        // Resize
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;

        // Restore content
        ctx.putImageData(savedData, 0, 0);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPos.current = { x, y };
    
    // For spray, we can draw immediately on click/tap
    if (tool.type === 'spray') {
        drawSpray(x, y);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const drawSpray = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = tool.color;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Density based on width
    const density = tool.width * 2; 
    
    for (let i = 0; i < density; i++) {
        const offset = tool.width * 1.5; // Spray radius
        const getRandomOffset = () => (Math.random() * offset * 2) - offset;
        const px = x + getRandomOffset();
        const py = y + getRandomOffset();
        
        // Simple 1x1 rects for particles
        ctx.fillRect(px, py, 1, 1); 
    }
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPos.current) return;

    ctx.lineWidth = tool.width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (tool.type) {
        case 'eraser':
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter for eraser
            break;
        case 'watercolor':
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.4; // Semi-transparent
            ctx.strokeStyle = tool.color;
            // Slight shadow for "wet" edge effect
            ctx.shadowBlur = 2;
            ctx.shadowColor = tool.color;
            break;
        case 'spray':
            // Spray is handled separately in loop
            drawSpray(x, y);
            lastPos.current = { x, y };
            return;
        case 'marker':
        default:
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = tool.color;
            ctx.shadowBlur = 0;
            break;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPos.current = { x, y };
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const { x, y } = getCoordinates(e);
    draw(x, y);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white rounded-xl shadow-inner overflow-hidden touch-none border-4 border-kid-blue border-dashed cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={handleMove}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={handleMove}
        className="w-full h-full block"
      />
    </div>
  );
});

export default Canvas;