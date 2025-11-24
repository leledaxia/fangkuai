import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Particle } from '../types';
import { NEON_COLORS } from '../constants';

interface FireworksProps {
  width: number;
  height: number;
  cellSize: number;
}

export interface FireworksHandle {
  explode: (rowY: number) => void;
  reset: () => void;
}

const Fireworks = forwardRef<FireworksHandle, FireworksProps>(({ width, height, cellSize }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);

  const createParticles = (yIndex: number) => {
    // Center of the row in pixels
    const centerY = (yIndex * cellSize) + (cellSize / 2);
    
    // Spawn particles across the width of the row
    for (let i = 0; i < 40; i++) {
        // Random x position along the row
        const startX = Math.random() * width;
        const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        
        particlesRef.current.push({
            x: startX,
            y: centerY,
            vx: (Math.random() - 0.5) * 10, // Horizontal burst
            vy: (Math.random() - 0.5) * 10 - 2, // Slight upward bias
            alpha: 1,
            color: color,
            size: Math.random() * 4 + 2,
            life: 1.0
        });
    }
  };

  useImperativeHandle(ref, () => ({
    explode: (rowY: number) => {
      createParticles(rowY);
    },
    reset: () => {
        particlesRef.current = [];
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      // Clear canvas but keep a tiny trail effect optionally, but for clear fireworks we clear rect
      ctx.clearRect(0, 0, width, height);
      // Or for trails:
      // ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      // ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particlesRef.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.vx *= 0.96; // Air resistance
        p.vy *= 0.96;
        p.life -= 0.015;
        p.alpha = Math.max(0, p.life);

        if (p.life <= 0) {
            particlesRef.current.splice(index, 1);
            return;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      });
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height]);

  return (
    <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 pointer-events-none z-20"
    />
  );
});

Fireworks.displayName = 'Fireworks';

export default Fireworks;