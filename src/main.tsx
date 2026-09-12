import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initZoomLock } from './utils/preventZoom';
import { AppearanceService } from './services/appearanceService';

// Initialize appearance settings (theme preset, glow, animations)
AppearanceService.init();

// Lock viewport scale at 100% across all devices and input methods
initZoomLock();

// Register Service Worker for PWA and mobile push alerts (iOS 16.4+ / Android)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('ServiceWorker registration error:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
