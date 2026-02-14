"use client";

import { useEffect, useState } from "react";

interface ProbabilityBarProps {
  probability: number; // 0-100
}

export default function ProbabilityBar({ probability }: ProbabilityBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(probability));
    return () => cancelAnimationFrame(t);
  }, [probability]);

  return (
    <div className="w-full h-[3px] bg-ft-green-ghost mt-3.5 relative overflow-hidden">
      <div
        className="h-full transition-all duration-1000 ease-out shadow-glow-bar"
        style={{
          width: `${width}%`,
          background: "linear-gradient(90deg, #00802b, #00ff41)",
        }}
      />
    </div>
  );
}
