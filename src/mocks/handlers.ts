import { rest } from 'msw';
import { Trade } from '../types';

// const today = new Date().toISOString().slice(0, 10);

const initialTrades: Trade[] = [
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
  // keep a T2 (no leading zeros) with version 2 so tests that submit T2 v1 are blocked
  {
    tradeId: 'T2',
    version: 2,
    counterPartyId: 'CP-205',
    bookId: 'B3',
    maturityDate: '10/09/2025',
    createdDate: '22/07/2024',
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
];

let trades: Trade[] = initialTrades.map((t) => ({ ...t }));
export function parseLocalDate(dateStr: string) {
  if (!dateStr) return new Date(NaN);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const slash = /^\d{2}\/\d{2}\/\d{4}$/;
  if (iso.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return new Date(NaN);
    return new Date(y, m - 1, d);
  }
  if (slash.test(dateStr)) {
    const parts = dateStr.split('/').map(Number);
    const [d, m, y] = parts;
    if (!y || !m || !d) return new Date(NaN);
    return new Date(y, m - 1, d);
  }
  return new Date(NaN);
}

function computeExpired(t: Trade) {
  const mat = parseLocalDate(t.maturityDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return mat.getTime() < now.getTime() ? 'Y' : 'N';
}

export const handlers = [
  // health check used by E2E to wait for the app/backend to be ready
  rest.get('/__health', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ status: 'ok' }));
  }),
  rest.get('/api/trades', (req, res, ctx) => {
    // server-side filtering/sorting/pagination
    const q = req.url.searchParams;
    const page = Number(q.get('page') || '0');
    const pageSize = Number(q.get('pageSize') || '10');
    const sortField = q.get('sortField') || undefined;
    const sortDir = (q.get('sortDir') as 'asc' | 'desc') || undefined;
    const filtersRaw = q.get('filters') || undefined;

    let list = trades.map((t) => ({ ...t, expired: computeExpired(t) }));

    // apply filters (filters is expected to be DataGrid's filterModel)
    if (filtersRaw) {
      try {
        const filterModel = JSON.parse(filtersRaw);
        const items = filterModel?.items || [];
        items.forEach((it: any) => {
          const col = it.columnField || it.field || it.column || it.columnField;
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
            // numeric comparisons for version or numeric content
            if (op === '>') return Number(cell) > Number(val);
            if (op === '<') return Number(cell) < Number(val);
            return cellStr.includes(v);
          });
        });
      } catch (_e) {
        // ignore parse errors
      }
    }

    // apply sorting across the full list before pagination
    if (sortField) {
      list.sort((a: any, b: any) => {
        const av = a[sortField];
        const bv = b[sortField];
        // handle numbers
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'desc' ? bv - av : av - bv;
        }
        // handle dates: accept either YYYY-MM-DD or DD/MM/YYYY formats
        const isoDate = /^\d{4}-\d{2}-\d{2}$/;
        const slashDate = /^\d{2}\/\d{2}\/\d{4}$/;
        if (isoDate.test(String(av)) && isoDate.test(String(bv))) {
          const ad = new Date(av).getTime();
          const bd = new Date(bv).getTime();
          return sortDir === 'desc' ? bd - ad : ad - bd;
        }
        if (slashDate.test(String(av)) && slashDate.test(String(bv))) {
          const ad = parseLocalDate(String(av)).getTime();
          const bd = parseLocalDate(String(bv)).getTime();
          return sortDir === 'desc' ? bd - ad : ad - bd;
        }
        return sortDir === 'desc'
          ? String(bv).localeCompare(String(av))
          : String(av).localeCompare(String(bv));
      });
    }

    const start = page * pageSize;
    return res(
      ctx.status(200),
      ctx.json({
        total: list.length,
        data: list.slice(start, start + pageSize),
      })
    );
  }),

  rest.post('/api/trades', (req, res, ctx) => {
    // validate body
    // @ts-ignore
    const t: Trade = req.body;
    // ensure createdDate exists (server assigns creation date if client didn't)
    const now = new Date();
    // server-side createdDate uses DD/MM/YYYY to match mock data format
    const createdDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;
    if (!t.createdDate) t.createdDate = createdDateStr;

    // business rule: reject maturity date before today
    const maturityDate = parseLocalDate(t.maturityDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (
      isNaN(maturityDate.getTime()) ||
      maturityDate.getTime() < startOfToday.getTime()
    ) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Maturity date is before today' })
      );
    }

    const existing = trades.filter((x) => x.tradeId === t.tradeId);
    if (existing.some((x) => x.version > t.version)) {
      return res(ctx.status(409), ctx.json({ error: 'Lower version exists' }));
    }

    const sameVersion = existing.find((x) => x.version === t.version);
    if (sameVersion) {
      // simulate replace
      // preserve original createdDate when replacing
      t.createdDate = sameVersion.createdDate || t.createdDate;
      trades = trades.map((x) =>
        x.tradeId === t.tradeId && x.version === t.version ? t : x
      );
      return res(ctx.status(200), ctx.json({ replaced: true, trade: t }));
    }

    // for new trades ensure createdDate set
    if (!t.createdDate) t.createdDate = createdDateStr;
    trades.push(t);
    return res(ctx.status(201), ctx.json({ trade: t }));
  }),
];

// Export helper so tests can reset mocked data between suites
export function resetTrades() {
  trades = initialTrades.map((t) => ({ ...t }));
}
