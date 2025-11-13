import { Trade } from '../types';
import * as api from './apiClient';

// Allow runtime override so tests can set the path without using import.meta
let TRADE_BASE_PATH = '/api/trades';
export function setTradeBasePath(path: string) {
  TRADE_BASE_PATH = path;
}

function tradesUrl(suffix = '') {
  return `${TRADE_BASE_PATH}${suffix}`;
}

export async function listTrades(
  page = 0,
  pageSize = 10,
  sortModel?: Array<{ field: string; sort: 'asc' | 'desc' }>,
  filterModel?: any
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (sortModel && sortModel.length > 0) {
    params.set('sortField', sortModel[0].field);
    params.set('sortDir', sortModel[0].sort);
  }
  if (filterModel) {
    params.set('filters', JSON.stringify(filterModel));
  }
  return api.get<{ total: number; data: Trade[] }>(
    `${tradesUrl('?')}${params.toString()}`
  );
}

export async function createTrade(t: Trade) {
  return api.post(tradesUrl(''), t);
}
