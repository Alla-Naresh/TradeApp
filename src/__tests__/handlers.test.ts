/**
 * Tests for MSW handlers in `src/mocks/handlers.ts`.
 *
 * Each test creates a fresh `setupServer(...handlers)` instance by re-requiring
 * the handlers module inside `jest.isolateModules` so the in-memory `trades`
 * array is reset per test.
 */

async function withFreshServer(fn: (_baseUrl: string) => Promise<void>) {
  // create a fresh server instance using a fresh module load
  await jest.isolateModulesAsync(async () => {
    const { setupServer } = require('msw/node');
    const { handlers } = require('../mocks/handlers');
    const server = setupServer(...handlers);
    server.listen({ onUnhandledRequest: 'warn' });
    try {
      await fn('http://localhost');
    } finally {
      server.close();
    }
  });
}

describe('mocks/handlers', () => {
  jest.setTimeout(10000);

  it('responds to health check', async () => {
    await withFreshServer(async (base) => {
      const res = await fetch(`${base}/__health`);
      expect(res.status).toBe(200);
      const j = await res.json();
      expect(j).toEqual({ status: 'ok' });
    });
  });

  it('returns trades list with total and data', async () => {
    await withFreshServer(async (base) => {
      const res = await fetch(`${base}/api/trades`);
      expect(res.status).toBe(200);
      const j = await res.json();
      expect(j).toHaveProperty('total');
      expect(Array.isArray(j.data)).toBe(true);
      expect(j.total).toBeGreaterThanOrEqual(j.data.length);
    });
  });

  it('rejects trade when maturity date is before today', async () => {
    await withFreshServer(async (base) => {
      const body = {
        tradeId: 'TX',
        version: 1,
        counterPartyId: 'CP-X',
        bookId: 'B1',
        maturityDate: '01/01/2000',
      };
      const res = await fetch(`${base}/api/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      const j = await res.json();
      expect(j).toHaveProperty('error');
      expect(String(j.error)).toMatch(/Maturity date is before today/i);
    });
  });

  it('rejects trade when a higher version exists (409)', async () => {
    await withFreshServer(async (base) => {
      // T001 has version 2 present in the initial dataset; sending version 1 should fail
      const body = {
        tradeId: 'T001',
        version: 1,
        counterPartyId: 'CP-101',
        bookId: 'B1',
        maturityDate: '31/12/2099',
      };
      const res = await fetch(`${base}/api/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(409);
      const j = await res.json();
      expect(j).toHaveProperty('error');
      expect(String(j.error)).toMatch(/Lower version exists/i);
    });
  });

  it('replaces trade when same version exists and preserves createdDate', async () => {
    await withFreshServer(async (base) => {
      // T001 version 2 exists with createdDate '01/12/2024' in handlers initial data
      const body = {
        tradeId: 'T001',
        version: 2,
        counterPartyId: 'CP-101',
        bookId: 'B1',
        maturityDate: '31/12/2099',
      };
      const res = await fetch(`${base}/api/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(200);
      const j = await res.json();
      expect(j).toHaveProperty('replaced', true);
      expect(j).toHaveProperty('trade');
      expect(j.trade.tradeId).toBe('T001');
      // createdDate should be preserved from the existing record
      expect(j.trade.createdDate).toBeDefined();
      // original createdDate in handlers is '01/12/2024'
      expect(String(j.trade.createdDate)).toMatch(/01\/12\/2024/);
    });
  });
});
