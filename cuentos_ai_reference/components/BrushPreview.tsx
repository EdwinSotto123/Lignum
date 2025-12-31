import React, { useRef, useEffect } from 'react';
import { DrawingTool } from '../types';

interface BrushPreviewProps {
  tool: DrawingTool;
}

const BrushPreview: React.FC<BrushPreviewProps> = ({ tool }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw checkerboard background (for eraser/transparency visibility)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw checkerboard
    const size = 10;
    ctx.fillStyle = '#f0f0f0';
    for(let i=0; i<canvas.width; i+=size) {
        for(let j=0; j<canvas.height; j+=size) {
            if((i/size + j/size) % 2 === 0) ctx.fillRect(i, j, size, size);
        }
    }

    // Draw stroke preview (S-curve)
    const points = [
        {x: 20, y: 50},
        {x: 50, y: 20},
        {x: 100, y: 80},
        {x: 130, y: 50}
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool.width;

    if (tool.type === 'spray') {
        ctx.fillStyle = tool.color;
        const density = tool.width * 3; // Higher density for preview look
        
        // Simulate spray along the path
        for (let t = 0; t <= 1; t += 0.05) {
             // Simple Bezier interpolation approx for spray position
             const x = (1-t)*(1-t)*points[0].x + 2*(1-t)*t*points[1].x + t*t*points[2].x; // partial curve
             // Just spraying along a line for simplicity in preview
             const lx = 20 + t * 110;
             const ly = 50 + Math.sin(t * Math.PI * 2) * 20;

             for (let i = 0; i < density; i++) {
                const offset = tool.width; 
                const getRandomOffset = () => (Math.random() * offset * 2) - offset;
                ctx.fillRect(lx + getRandomOffset(), ly + getRandomOffset(), 1, 1);
            }
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);

        if (tool.type === 'eraser') {
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 2;
            ctx.shadowColor = '#000000'; // Shadow to show eraser bounds on white
        } else if (tool.type === 'watercolor') {
            ctx.strokeStyle = tool.color;
            ctx.globalAlpha = 0.6;
            ctx.shadowBlur = 4;
            ctx.shadowColor = tool.color;
        } else {
            // Marker
            ctx.strokeStyle = tool.color;
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
        
        // Reset global alpha
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

  }, [tool]);

  return (
    <div className="flex flex-col items-center bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <span className="text-xs font-bold text-gray-400 uppercase mb-1">Vista Previa</span>
        <canvas 
            ref={canvasRef} 
            width={150} 
            height={100} 
            className="rounded-lg border border-gray-200 bg-white"
        />
    </div>
  );
};

export default BrushPreview;
