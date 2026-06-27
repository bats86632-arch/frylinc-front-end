import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// @ts-expect-error virtual module provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRegistered(r: any) {
    if (r) {
      setInterval(() => {
        r.update();
      }, 5 * 60 * 1000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update();
        }
      });
      
      window.addEventListener('focus', () => {
        r.update();
      });
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRegisterError(error: any) {
    console.error('SW registration error', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
