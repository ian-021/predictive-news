"use client";

import { useEffect, useRef, useMemo } from "react";
import type { PricePoint } from "@/lib/types";

interface SparklineChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
}

export function SparklineChart({ data, width = 600, height = 200 }: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.01;

    return { prices, min, max, range, timestamps: data.map((d) => d.timestamp) };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processedData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const { prices, min, range } = processedData;
    const padding = { top: 20, right: 16, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "var(--bg-card)";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "#1e1e2e";
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = processedData.max - (range / gridLines) * i;
      ctx.fillStyle = "#5c5c6e";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(value * 100)}%`, padding.left - 8, y + 4);
    }

    // X-axis labels
    const timestamps = processedData.timestamps;
    const labelCount = Math.min(5, timestamps.length);
    ctx.fillStyle = "#5c5c6e";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (timestamps.length - 1));
      const x = padding.left + (idx / (timestamps.length - 1)) * chartW;
      const date = new Date(timestamps[idx]);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      ctx.fillText(label, x, height - 10);
    }

    // Price line
    const lineColor =
      prices[prices.length - 1] >= prices[0] ? "#00d46a" : "#ff4757";

    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 0; i < prices.length; i++) {
      const x = padding.left + (i / (prices.length - 1)) * chartW;
      const y = padding.top + chartH - ((prices[i] - min) / range) * chartH;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Gradient fill under the line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, lineColor + "30");
    gradient.addColorStop(1, lineColor + "05");

    ctx.lineTo(
      padding.left + chartW,
      padding.top + chartH
    );
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Current price dot
    const lastX = padding.left + chartW;
    const lastY = padding.top + chartH - ((prices[prices.length - 1] - min) / range) * chartH;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor + "40";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [processedData, width, height]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
        }}
      >
        No chart data available
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: width,
        height,
        borderRadius: "var(--radius-md)",
      }}
    />
  );
}
