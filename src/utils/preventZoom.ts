/**
 * Sentinel-X Platform Viewport & Zoom Lock
 * Locks page scale at 100% and prevents accidental pinch, trackpad, and keyboard zooms
 * while keeping all native scrolling completely fluid.
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
}
