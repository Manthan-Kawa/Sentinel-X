import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initZoomLock } from './utils/preventZoom';

// Lock viewport scale at 100% across all devices and input methods
initZoomLock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
