import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Some linters/TS setups may report `process` as not defined in ESM configs.
// Declare it here so TypeScript understands we're accessing env vars from Node.
declare const process: { env: { [key: string]: string | undefined } };

// Dev middleware is intentionally opt-in via VITE_DISABLE_MSW=true.
// By default MSW (in-browser) will be authoritative. This file keeps a
// lightweight middleware to support environments where a service worker
// can't be registered (CI variants) only when explicitly requested.
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@mui/x-data-grid')) return 'vendor-datagrid';
            if (
              id.includes('@mui/material') ||
              id.includes('@mui/icons-material') ||
              id.includes('@emotion')
            )
              return 'vendor-mui';
            if (id.includes('msw')) return 'vendor-msw';
            return 'vendor';
          }
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      output: {
        comments: false,
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'dev-middleware',
      configureServer(server) {
        // Only enable when explicitly requested via env var AND when no
        // external API base is configured. If `VITE_API_BASE` is set we
        // want requests to go to the real backend instead of the dev
        // middleware.

        if (
          process.env.VITE_DISABLE_MSW !== 'true' ||
          process.env.VITE_API_BASE
        )
          return;

        console.log('in vite.config');

        const trades = [
          {
            tradeId: 'T001',
            version: 1,
            counterPartyId: 'CP-101',
            bookId: 'B1',
            maturityDate: '31/12/2026',
            createdDate: '10/11/2024',
            expired: 'N',
          },
          {
            tradeId: 'T001',
            version: 2,
            counterPartyId: 'CP-101',
            bookId: 'B1',
            maturityDate: '15/03/2027',
            createdDate: '01/12/2024',
            expired: 'N',
          },
          {
            tradeId: 'T002',
            version: 1,
            counterPartyId: 'CP-205',
            bookId: 'B3',
            maturityDate: '10/09/2025',
            createdDate: '22/07/2024',
            expired: 'Y',
          },
          {
            tradeId: 'T003',
            version: 3,
            counterPartyId: 'CP-102',
            bookId: 'B2',
            maturityDate: '01/01/2028',
            createdDate: '05/10/2024',
            expired: 'N',
          },
          {
            tradeId: 'T004',
            version: 1,
            counterPartyId: 'CP-305',
            bookId: 'B4',
            maturityDate: '20/02/2025',
            createdDate: '11/06/2024',
            expired: 'Y',
          },
          {
            tradeId: 'T005',
            version: 2,
            counterPartyId: 'CP-110',
            bookId: 'B2',
            maturityDate: '30/08/2027',
            createdDate: '14/09/2024',
            expired: 'N',
          },
        ] as any[];

        const parseIsoLocalDate = (s: string) => {
          const parts = (s || '').split('-').map(Number);
          if (parts.length !== 3) return new Date(NaN);
          const [y, m, d] = parts;
          return new Date(y, m - 1, d);
        };

        const computeExpired = (t: any) => {
          const mat = parseIsoLocalDate(t.maturityDate);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          return mat.getTime() < now.getTime() ? 'Y' : 'N';
        };

        server.middlewares.use(async (req: any, res: any, next: any) => {
          let pathname = req.url || '';
          try {
            pathname = new URL(req.url as string, 'http://localhost').pathname;
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log('Error ', e);
          }

          if (pathname === '/__health') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (!pathname.startsWith('/api/trades')) return next();

          // eslint-disable-next-line no-console
          console.log('[DEV-MW] API request', req.method, req.url);

          try {
            const url = new URL(req.url, 'http://localhost');

            if (req.method === 'GET') {
              const page = Number(url.searchParams.get('page') || '0');
              const pageSize = Number(url.searchParams.get('pageSize') || '10');
              const sortField = url.searchParams.get('sortField') || undefined;
              const sortDir =
                (url.searchParams.get('sortDir') as 'asc' | 'desc') ||
                undefined;
              const filtersRaw = url.searchParams.get('filters') || undefined;

              let list = trades.map((t) => ({
                ...t,
                expired: computeExpired(t),
              }));

              if (filtersRaw) {
                try {
                  const filterModel = JSON.parse(filtersRaw);
                  const items = filterModel?.items || [];
                  items.forEach((it: any) => {
                    const col = it.columnField || it.field || it.column;
                    const op = it.operatorValue || it.operator || 'contains';
                    const val = it.value;
                    if (!col) return;
                    list = list.filter((row) => {
                      const cell = (row as any)[col];
                      if (cell == null) return false;
                      const cellStr = String(cell).toLowerCase();
                      const v = String(val ?? '').toLowerCase();
                      if (op === 'contains') return cellStr.includes(v);
                      if (op === 'equals' || op === 'is') return cellStr === v;
                      if (op === 'startsWith') return cellStr.startsWith(v);
                      if (op === 'endsWith') return cellStr.endsWith(v);
                      if (op === '>') return Number(cell) > Number(val);
                      if (op === '<') return Number(cell) < Number(val);
                      return cellStr.includes(v);
                    });
                  });
                } catch (e) {
                  console.log('Error ', e);
                }
              }

              if (sortField) {
                list.sort((a: any, b: any) => {
                  const av = a[sortField];
                  const bv = b[sortField];
                  if (typeof av === 'number' && typeof bv === 'number')
                    return sortDir === 'desc' ? bv - av : av - bv;
                  if (
                    /^\d{4}-\d{2}-\d{2}$/.test(String(av)) &&
                    /^\d{4}-\d{2}-\d{2}$/.test(String(bv))
                  ) {
                    const ad = new Date(av).getTime();
                    const bd = new Date(bv).getTime();
                    return sortDir === 'desc' ? bd - ad : ad - bd;
                  }
                  return sortDir === 'desc'
                    ? String(bv).localeCompare(String(av))
                    : String(av).localeCompare(String(bv));
                });
              }

              const start = page * pageSize;
              const body = JSON.stringify({
                total: list.length,
                data: list.slice(start, start + pageSize),
              });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(body);
              return;
            }

            if (req.method === 'POST') {
              let data = '';
              for await (const chunk of req) data += chunk;
              // eslint-disable-next-line no-console
              console.log('[DEV-MW] POST body raw:', data);
              const t = JSON.parse(data || '{}');
              // eslint-disable-next-line no-console
              console.log('[DEV-MW] POST parsed:', t);

              const now = new Date();
              const createdDateStr = `${now.getFullYear()}-${String(
                now.getMonth() + 1
              ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              if (!t.createdDate) t.createdDate = createdDateStr;

              const [y, m, d] = (t.maturityDate || '').split('-').map(Number);
              const maturityDate = new Date(y, m - 1, d);
              const startOfToday = new Date();
              startOfToday.setHours(0, 0, 0, 0);
              if (
                isNaN(maturityDate.getTime()) ||
                maturityDate.getTime() < startOfToday.getTime()
              ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({ error: 'Maturity date is before today' })
                );
                return;
              }

              const existing = trades.filter((x) => x.tradeId === t.tradeId);
              if (existing.some((x) => x.version > t.version)) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Lower version exists' }));
                return;
              }

              const same = existing.find((x) => x.version === t.version);
              if (same) {
                t.createdDate = same.createdDate || t.createdDate;
                for (let i = 0; i < trades.length; i++) {
                  if (
                    trades[i].tradeId === t.tradeId &&
                    trades[i].version === t.version
                  )
                    trades[i] = t;
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ replaced: true, trade: t }));
                return;
              }

              if (!t.createdDate) t.createdDate = createdDateStr;
              trades.push(t);
              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ trade: t }));
              return;
            }

            res.statusCode = 405;
            res.end();
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    middlewareMode: false,
  },
});
