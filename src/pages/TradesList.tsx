import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Button, Chip, Box, Snackbar, Alert } from '@mui/material';
import { listTrades } from '../services/tradeService';
import { Trade } from '../types';
import { useNavigate } from 'react-router-dom';

export default function TradesList() {
  const [rows, setRows] = useState<Trade[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(
    () => {
      try {
        const raw = sessionStorage.getItem('trades.pagination');
        return raw ? JSON.parse(raw) : { page: 0, pageSize: 5 };
      } catch {
        return { page: 0, pageSize: 5 };
      }
    }
  );
  const [sortModel, setSortModel] = useState(() => {
    try {
      const raw = sessionStorage.getItem('trades.sort');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [filterModel, setFilterModel] = useState(() => {
    try {
      const raw = sessionStorage.getItem('trades.filters');
      const parsed = raw ? JSON.parse(raw) : null;
      // Ensure we never return `null` because MUI DataGrid expects an object
      // with an `items` array. If storage contains `null` (stringified),
      // fall back to an empty filter model.
      return parsed && parsed.items ? parsed : { items: [] };
    } catch {
      return { items: [] };
    }
  });
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const raw = sessionStorage.getItem('trades.columns');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const navigate = useNavigate();

  const [exportSnackOpen, setExportSnackOpen] = useState(false);
  const [exportSnackMsg, setExportSnackMsg] = useState<string | null>(null);
  const [exportSnackSeverity, setExportSnackSeverity] = useState<
    'success' | 'error'
  >('success');

  useEffect(() => {
    setLoading(true);
    listTrades(
      paginationModel.page,
      paginationModel.pageSize,
      sortModel,
      filterModel
    )
      .then((r) => {
        setRows(r.data);
        setTotal(r.total ?? r.data.length);
      })
      .finally(() => setLoading(false));
  }, [paginationModel, sortModel, filterModel]);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail;
      if (!detail?.trade) return;
      const t: Trade = detail.trade;
      setRows((prev) => {
        const idx = prev.findIndex(
          (r) => r.tradeId === t.tradeId && r.version === t.version
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...t };
          return copy;
        }
        return [t, ...prev];
      });
    };
    window.addEventListener('trade:upserted', handler as EventListener);
    return () =>
      window.removeEventListener('trade:upserted', handler as EventListener);
  }, []);

  const cols: GridColDef[] = [
    { field: 'tradeId', headerName: 'Trade Id', width: 120 },
    { field: 'version', headerName: 'Version', width: 90 },
    { field: 'counterPartyId', headerName: 'Counter-Party Id', width: 150 },
    { field: 'bookId', headerName: 'Book-Id', width: 100 },
    { field: 'maturityDate', headerName: 'Maturity', width: 130 },
    { field: 'createdDate', headerName: 'Created', width: 130 },
    {
      field: 'expired',
      headerName: 'Expired',
      width: 110,
      renderCell: (params) => (
        <Chip
          color={params.value === 'Y' ? 'error' : 'success'}
          label={params.value}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            onClick={() => navigate(`/trades/${params.row.tradeId}`)}
          >
            Edit
          </Button>
        </Box>
      ),
    },
  ];

  const exportCsv = () => {
    // Export all trades matching current filters/sort (not just current page)
    (async () => {
      setLoading(true);
      try {
        // request all rows by asking for pageSize == total (fallback to a large number)
        const fetchSize = total && total > 0 ? total : 10000;
        const res = await listTrades(0, fetchSize, sortModel, filterModel);
        const all = res.data;
        const csv = [
          [
            'tradeId',
            'version',
            'counterPartyId',
            'bookId',
            'maturityDate',
            'createdDate',
            'expired',
          ].join(','),
          ...all.map((r) =>
            [
              r.tradeId,
              String(r.version),
              r.counterPartyId,
              r.bookId,
              r.maturityDate,
              r.createdDate,
              r.expired,
            ]
              // escape any values containing commas/quotes
              .map((c) =>
                typeof c === 'string' && (c.includes(',') || c.includes('"'))
                  ? '"' + c.replace(/"/g, '""') + '"'
                  : String(c)
              )
              .join(',')
          ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trades.csv';
        a.click();
        URL.revokeObjectURL(url);
        // show success snackbar
        setExportSnackMsg('CSV export completed');
        setExportSnackSeverity('success');
        setExportSnackOpen(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Export CSV failed', e);
        setExportSnackMsg('CSV export failed');
        setExportSnackSeverity('error');
        setExportSnackOpen(true);
      } finally {
        setLoading(false);
      }
    })();
  };

  useEffect(() => {
    sessionStorage.setItem(
      'trades.pagination',
      JSON.stringify(paginationModel)
    );
  }, [paginationModel]);

  useEffect(() => {
    sessionStorage.setItem('trades.filters', JSON.stringify(filterModel));
  }, [filterModel]);

  useEffect(() => {
    sessionStorage.setItem('trades.sort', JSON.stringify(sortModel));
  }, [sortModel]);

  useEffect(() => {
    sessionStorage.setItem('trades.columns', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  return (
    <div style={{ height: 520, width: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Button variant="outlined" size="small" onClick={exportCsv}>
          Export CSV
        </Button>
      </Box>
      <DataGrid
        rows={rows.map((r) => ({ ...r, id: `${r.tradeId}-${r.version}` }))}
        columns={cols}
        loading={loading}
        paginationMode="server"
        rowCount={total}
        pageSizeOptions={[5, 10, 25]}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => setPaginationModel(model)}
        sortModel={sortModel}
        onSortModelChange={(m) => setSortModel(m)}
        sortingMode="server"
        filterMode="server"
        filterModel={filterModel}
        onFilterModelChange={(m) => setFilterModel(m ?? { items: [] })}
        columnVisibilityModel={columnVisibility}
        onColumnVisibilityModelChange={(m) => setColumnVisibility(m)}
      />
      <Snackbar
        open={exportSnackOpen}
        autoHideDuration={3000}
        onClose={() => setExportSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setExportSnackOpen(false)}
          severity={exportSnackSeverity}
          sx={{ width: '100%' }}
        >
          {exportSnackMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}
