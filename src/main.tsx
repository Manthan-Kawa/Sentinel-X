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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
