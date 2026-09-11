/**
 * Sentinel-X Platform Viewport & Zoom Lock
 * Locks page scale at 100% and prevents accidental pinch, trackpad, and keyboard zooms
 * across desktop laptops, tablets, and mobile devices.
 */

export function initZoomLock(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Prevent laptop trackpad pinch-zoom and Ctrl + Mousewheel zoom
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 2. Prevent desktop/laptop keyboard zoom shortcuts (Ctrl/Cmd + Plus, Minus, Equal, Zero)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' ||
        e.key === '-' ||
        e.key === '=' ||
        e.key === '_' ||
        e.key === '0' ||
        e.code === 'NumpadAdd' ||
        e.code === 'NumpadSubtract' ||
        e.code === 'Equal' ||
        e.code === 'Minus' ||
        e.code === 'Digit0')
    ) {
      e.preventDefault();
    }
  });

  // 3. Prevent Safari iOS gesture zoom (pinch gesture events)
  const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'] as const;
  gestureEvents.forEach((evt) => {
    document.addEventListener(
      evt,
      (e: Event) => {
        e.preventDefault();
      },
      { passive: false }
    );
  });

  // 4. Prevent mobile multi-touch pinch-to-zoom on the viewport
  // (keeps map interaction intact inside .leaflet-container if needed)
  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        const isMap = (e.target as HTMLElement)?.closest?.('.leaflet-container');
        if (!isMap) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        const isMap = (e.target as HTMLElement)?.closest?.('.leaflet-container');
        if (!isMap) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  // 5. Prevent double-tap zoom on background/cards while keeping interactive elements responsive
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement;
        const isInteractive = target?.closest('button, a, input, select, textarea, [role="button"]');
        if (!isInteractive) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}
