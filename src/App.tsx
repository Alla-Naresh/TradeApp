import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CircularProgress from '@mui/material/CircularProgress';

const TradesList = React.lazy(() => import('./pages/TradesList'));
const TradeFormPage = React.lazy(() => import('./pages/TradeForm'));

export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    const handler = (e: any) => {
      const replaced = e?.detail?.replaced;
      const trade = e?.detail?.trade;
      // debug: log snack message so E2E can observe it in page console
      // eslint-disable-next-line no-console
      console.log(
        'SNACK_HANDLER',
        trade
          ? `${trade.tradeId} (v${trade.version}) ${
              replaced ? 'replaced' : 'saved'
            }`
          : 'Trade saved'
      );
      setSnackMsg(
        trade
          ? `${trade.tradeId} (v${trade.version}) ${
              replaced ? 'replaced' : 'saved'
            }`
          : 'Trade saved'
      );
      setSnackOpen(true);
    };
    window.addEventListener('trade:upserted', handler as EventListener);
    return () =>
      window.removeEventListener('trade:upserted', handler as EventListener);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Trade Store UI
          </Typography>
          <Button color="inherit" component={Link} to="/trades">
            Trades
          </Button>
          <Button color="inherit" component={Link} to="/trades/new">
            Add
          </Button>
          <IconButton
            sx={{ ml: 1 }}
            color="inherit"
            onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
            aria-label="toggle theme"
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <React.Suspense
          fallback={
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </div>
          }
        >
          <Routes>
            <Route path="/trades" element={<TradesList />} />
            <Route path="/trades/new" element={<TradeFormPage />} />
            <Route path="/trades/:id" element={<TradeFormPage />} />
            <Route path="/" element={<TradesList />} />
          </Routes>
        </React.Suspense>
        <Snackbar
          open={snackOpen}
          autoHideDuration={4000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            severity="success"
            sx={{ width: '100%' }}
            onClose={() => setSnackOpen(false)}
          >
            {snackMsg}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}
