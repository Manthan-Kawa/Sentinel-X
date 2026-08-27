import { useState, useEffect } from 'react';

interface AnimatedCircleGaugeProps {
  score: number;
  max?: number;
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  gradientColors?: [string, string, string];
}

export function AnimatedCircleGauge({
  score,
  max = 100,
  size = 120,
  strokeWidth = 9,
  label = 'CRITICAL RISK',
  gradientColors = ['#f87171', '#ef4444', '#b91c1c'],
}: AnimatedCircleGaugeProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [fillOffset, setFillOffset] = useState(264); // Start at 0% (full offset = hidden)
  const radius = 42;
  const circumference = 264; // 2 * Math.PI * 42 = ~263.89

  useEffect(() => {
    // 1. Trigger SVG stroke fill-up animation with CSS cubic-bezier transition
    const targetOffset = circumference - (score / max) * circumference;
    const timer = setTimeout(() => {
      setFillOffset(targetOffset);
    }, 50);

    // 2. Count up the center number in sync over 1.4s
    let animationFrameId: number;
    const duration = 1400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCurrentScore(score * easeOut);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [score, max]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <defs>
            {/* Rich Red/Crimson gradient for risk score */}
            <linearGradient id="riskRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="60%" stopColor={gradientColors[1]} />
              <stop offset="100%" stopColor={gradientColors[2]} />
            </linearGradient>

            {/* Pulsating red neon glow filter */}
            <filter id="riskGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Animated fill-up circle with hardware-accelerated cubic-bezier transition */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#riskRedGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={fillOffset}
            strokeLinecap="round"
            filter="url(#riskGlow)"
            style={{
              transition: 'stroke-dashoffset 1.35s cubic-bezier(0.34, 1.25, 0.64, 1)',
            }}
          />
        </svg>

        {/* Center counter text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            {Math.round(currentScore)}
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">/ {max}</span>
        </div>
      </div>

      {label && (
        <span
          className="mt-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-red-400"
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 0 12px rgba(239,68,68,0.15)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
