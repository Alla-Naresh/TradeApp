import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { setBaseUrl } from './services/apiClient';
import { setTradeBasePath } from './services/tradeService';
import './index.css';

// Ensure MSW service worker registers before rendering the app in dev
async function init() {
  // Read Vite env once for clarity. We intentionally only use `import.meta`
  // inside this browser-only bootstrap file.
  const viteEnv = (import.meta as any).env || {};
  const enableMsw = viteEnv?.VITE_DISABLE_MSW === 'false';
  const viteApiBase = viteEnv?.VITE_API_BASE as string | undefined;

  // Start MSW worker in dev only when not explicitly disabled and when
  // there's no external API base configured. If `VITE_API_BASE` is set we
  // prefer talking to the real backend unless the developer explicitly
  // requests MSW via VITE_DISABLE_MSW.
  if (enableMsw) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      const { worker } = await import('./mocks/browser');
      // wait for worker to start so early fetches are intercepted
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      await worker.start();
    } catch (e) {
      // if worker fails to start, continue and let network requests run (dev fallback)
      // eslint-disable-next-line no-console
      console.error('MSW worker failed to start', e);
    }
  } else {
    try {
      const apiBase = viteApiBase;
      if (apiBase) {
        try {
          const u = new URL(apiBase);
          // Use origin as the api client base and the pathname as the trade path
          // to avoid duplicated path segments (e.g., /trades/trades).
          setBaseUrl(u.origin);
          if (u.pathname && u.pathname !== '/') {
            setTradeBasePath(u.pathname.replace(/\/$/, ''));
          }
        } catch (_e) {
          // If parsing fails, fall back to using the raw value as the base.
          setBaseUrl(apiBase);
        }
      }
    } catch (_e) {
      // ignore in environments where import.meta may not be available
    }
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Start the app
void init();
