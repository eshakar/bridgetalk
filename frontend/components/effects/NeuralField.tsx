"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; r: number; color: string; phase: number };

const LINK_DISTANCE = 140;

/** Sparse drifting nodes with faint links between neighbours, drawn on a transparent 2D canvas. */
export function NeuralField({ colors, density = 0.00006 }: { colors: string[]; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let nodes: Node[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(width * height * density);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.8 + Math.random() * 1.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      for (const node of nodes) {
        node.x = (node.x + node.vx + width) % width;
        node.y = (node.y + node.vy + height) % height;
      }
      ctx!.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > LINK_DISTANCE) continue;
          ctx!.globalAlpha = (1 - distance / LINK_DISTANCE) * 0.18;
          ctx!.strokeStyle = a.color;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }
      for (const node of nodes) {
        const pulse = 0.45 + 0.4 * Math.sin(time / 900 + node.phase);
        ctx!.fillStyle = node.color;
        ctx!.globalAlpha = pulse * 0.15;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, node.r * 3.5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = pulse;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [colors, density]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
