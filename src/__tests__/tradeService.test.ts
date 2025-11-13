// mock the apiClient module used by tradeService
jest.mock('../services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  setBaseUrl: jest.fn(),
}));

import * as api from '../services/apiClient';
import {
  listTrades,
  createTrade,
  setTradeBasePath,
} from '../services/tradeService';

describe('tradeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // reset trade base path to default
    setTradeBasePath('/api/trades');
  });

  it('calls api.get with default paging params', async () => {
    (api.get as jest.Mock).mockResolvedValue({ total: 0, data: [] });
    await listTrades();
    expect(api.get).toHaveBeenCalledTimes(1);
    const called = (api.get as jest.Mock).mock.calls[0][0] as string;
    expect(called.startsWith('/api/trades?')).toBeTruthy();
    expect(called).toContain('page=0');
    expect(called).toContain('pageSize=10');
  });

  it('includes sort and filters when provided', async () => {
    (api.get as jest.Mock).mockResolvedValue({ total: 0, data: [] });
    const sortModel = [{ field: 'version', sort: 'desc' as const }];
    const filterModel = {
      items: [
        { columnField: 'tradeId', operatorValue: 'contains', value: 'T' },
      ],
    };
    await listTrades(1, 7, sortModel, filterModel);
    const called = (api.get as jest.Mock).mock.calls[0][0] as string;
    expect(called).toContain('page=1');
    expect(called).toContain('pageSize=7');
    expect(called).toContain('sortField=version');
    expect(called).toContain('sortDir=desc');
    expect(called).toContain('filters=');
  });

  it('createTrade calls api.post with the trade body and current base path', async () => {
    (api.post as jest.Mock).mockResolvedValue({ trade: {} });
    setTradeBasePath('/base/trades');
    const trade = { tradeId: 'T1', version: 1 } as any;
    await createTrade(trade);
    expect(api.post).toHaveBeenCalledWith('/base/trades', trade);
  });
});
