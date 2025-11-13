// Runtime configuration helper.
//
// NOTE: Avoid using `import.meta` at module-evaluation time in files that may
// be imported by Jest (Node) because untransformed `import.meta` usage can
// cause syntax errors. Instead we provide a small runtime-config object with
// setters that `src/main.tsx` (browser-only) will call with values from
// `import.meta.env`. When running under Node/Jest tests, test code can set
// environment variables on `process.env` or call `setApiBase` directly.

import { setBaseUrl } from './services/apiClient';
import { setTradeBasePath } from './services/tradeService';

let apiBase: string | undefined = undefined;
let tradePath = '/api/trades';

export function setApiBase(base?: string) {
  apiBase = base;
  if (apiBase) {
    try {
      const u = new URL(apiBase);
      // set the HTTP client to the origin and the trade path separately to
      // avoid duplicated path segments when apiBase includes a pathname.
      setBaseUrl(u.origin);
      tradePath =
        u.pathname && u.pathname !== '/'
          ? u.pathname.replace(/\/$/, '')
          : '/api/trades';
      if (tradePath) setTradeBasePath(tradePath);
    } catch (_e) {
      // fallback: use the provided base directly
      setBaseUrl(apiBase);
      tradePath = '/api/trades';
    }
  } else {
    // reset to defaults
    setBaseUrl('http://localhost');
    tradePath = '/api/trades';
    setTradeBasePath(tradePath);
  }
}

export function getApiBase() {
  if (!apiBase) {
    const envBase = (globalThis as any)?.process?.env?.VITE_API_BASE;
    if (envBase) apiBase = envBase;
  }
  return apiBase;
}

export function getTradePath() {
  return tradePath;
}

export default {
  setApiBase,
  getApiBase,
  getTradePath,
};
