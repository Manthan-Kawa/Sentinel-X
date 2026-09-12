import React, { useState, useEffect } from 'react';
import { AppearanceService } from '@/services/appearanceService';

export interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'down';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SlideIn entrance animation wrapper for page sections, matching the analyst portal style.
 * Honors user & analyst 'SlideIn Entrance Animations' appearance toggle.
 */
export function SlideIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  style = {},
}: SlideInProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    return AppearanceService.isAnimationsEnabled();
  });
  const [vis, setVis] = useState(() => !animationsEnabled);

  useEffect(() => {
    const handleAnimChange = () => {
      const enabled = AppearanceService.isAnimationsEnabled();
      setAnimationsEnabled(enabled);
      if (!enabled) setVis(true);
    };
    window.addEventListener('sentinel_appearance_changed', handleAnimChange);
    return () => window.removeEventListener('sentinel_appearance_changed', handleAnimChange);
  }, []);

  useEffect(() => {
    if (!animationsEnabled) {
      setVis(true);
      return;
    }
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay, animationsEnabled]);

  if (!animationsEnabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const from =
    direction === 'left'
      ? 'translateX(-36px)'
      : direction === 'right'
      ? 'translateX(36px)'
      : direction === 'down'
      ? 'translateY(-20px)'
      : 'translateY(24px)';

  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : from,
        transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  );
}

export default SlideIn;
