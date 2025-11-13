import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { createTrade, listTrades } from '../services/tradeService';
import { Trade } from '../types';

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Validate maturity as a date-only string (YYYY-MM-DD) to avoid
// timezone coercion issues where `new Date('YYYY-MM-DD')` is parsed as
// UTC midnight and may appear as the previous day in local timezones.
const todayString = localDateString();

const schema = yup.object({
  tradeId: yup.string().required(),
  version: yup.number().required().integer().min(1),
  counterPartyId: yup.string().required(),
  bookId: yup.string().required(),
  maturityDate: yup
    .string()
    .required()
    .test('maturity-not-in-past', 'Maturity must be today or later', (val) => {
      if (!val) return false;
      // expect YYYY-MM-DD; compare lexicographically which works for this format
      return val >= todayString;
    }),
});

export default function TradeFormPage() {
  const navigate = useNavigate();
  const params = useParams();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Trade>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      tradeId: (params.id as string) || '',
      version: 1 as any,
      counterPartyId: '',
      bookId: '',
      maturityDate: localDateString(),
    },
  });

  const isEdit = Boolean(params.id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<Trade | null>(null);

  useEffect(() => {
    // If params.id present, fetch the trade(s) and prefill the form so only
    // version and maturityDate remain editable. If params.id is absent (Add
    // flow), reset the form to the empty/new defaults so fields are blank and
    // version/maturity are prefilled as expected.
    if (!params.id) {
      reset({
        tradeId: '',
        version: 1 as any,
        counterPartyId: '',
        bookId: '',
        maturityDate: localDateString(),
      });
      return;
    }

    (async () => {
      try {
        const list = await listTrades(0, 1000);
        const found = list.data.filter(
          (t) => t.tradeId === (params.id as string)
        );
        if (found.length === 0) return;
        // pick the highest version as the current one to edit
        const current = found.reduce((a, b) => (a.version > b.version ? a : b));
        // Reset form values to the found trade (maturityDate is already YYYY-MM-DD)
        reset({
          tradeId: current.tradeId,
          version: current.version,
          counterPartyId: current.counterPartyId,
          bookId: current.bookId,
          maturityDate: current.maturityDate,
          createdDate: current.createdDate,
          expired: current.expired,
        });
      } catch (_e) {
        // ignore; leave defaults
      }
    })();
  }, [params.id, reset]);

  const onSubmit = async (data: Trade) => {
    // client-side check for existing higher/lower/same versions
    try {
      const list = await listTrades(0, 1000);
      const existing = list.data.filter((t) => t.tradeId === data.tradeId);
      const versionNum = Number((data as any).version);
      if (existing.some((x) => x.version > versionNum)) {
        // block lower version submission
        alert('A higher version exists for this Trade Id. Submission blocked.');
        return;
      }
      if (existing.some((x) => x.version === versionNum)) {
        // need confirmation to replace
        // ensure maturityDate is a YYYY-MM-DD string (Yup may coerce to Date)
        const maturity =
          (data.maturityDate as any) instanceof Date
            ? (data.maturityDate as any).toISOString().slice(0, 10)
            : (data.maturityDate as unknown as string);
        setPending({
          ...data,
          version: versionNum,
          maturityDate: maturity,
          createdDate: todayString,
        });
        setConfirmOpen(true);
        return;
      }

      // ensure maturityDate is YYYY-MM-DD string before sending (Yup date -> Date object)
      const payload: Trade = {
        ...data,
        version: versionNum,
        maturityDate:
          (data.maturityDate as any) instanceof Date
            ? (data.maturityDate as any).toISOString().slice(0, 10)
            : (data.maturityDate as unknown as string),
      };
      const res = await createTrade(payload);
      const createdTrade = res?.trade ?? payload;
      // dispatch an event so lists can update in-place
      try {
        window.dispatchEvent(
          new CustomEvent('trade:upserted', {
            detail: { trade: createdTrade, replaced: !!res?.replaced },
          })
        );
      } catch (e) {
        // ignore in environments where dispatchEvent may be restricted
        void e;
      }
      navigate('/trades');
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  const confirmReplace = async () => {
    if (!pending) return;
    try {
      // (removed debug log)
      // pending.maturityDate should already be normalized to YYYY-MM-DD
      const res = await createTrade(pending);
      const createdTrade = res?.trade ?? pending;
      // (removed debug log)
      // notify listeners for in-place update
      try {
        window.dispatchEvent(
          new CustomEvent('trade:upserted', {
            detail: { trade: createdTrade, replaced: !!res?.replaced },
          })
        );
      } catch (e) {
        void e;
      }
      setConfirmOpen(false);
      setPending(null);
      navigate('/trades');
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'grid', gap: 2, maxWidth: 480 }}
      >
        <Controller
          name="tradeId"
          control={control}
          render={({ field }) => (
            <TextField
              label="Trade Id"
              {...field}
              disabled={isEdit}
              error={!!errors.tradeId}
              helperText={errors.tradeId?.message as any}
            />
          )}
        />
        <Controller
          name="version"
          control={control}
          render={({ field }) => (
            <TextField
              label="Version"
              type="number"
              {...field}
              error={!!errors.version}
              helperText={errors.version?.message as any}
            />
          )}
        />
        <Controller
          name="counterPartyId"
          control={control}
          render={({ field }) => (
            <TextField
              label="Counter-Party Id"
              {...field}
              disabled={isEdit}
              error={!!errors.counterPartyId}
              helperText={errors.counterPartyId?.message as any}
            />
          )}
        />
        <Controller
          name="bookId"
          control={control}
          render={({ field }) => (
            <TextField
              label="Book-Id"
              {...field}
              disabled={isEdit}
              error={!!errors.bookId}
              helperText={errors.bookId?.message as any}
            />
          )}
        />
        <Controller
          name="maturityDate"
          control={control}
          render={({ field }) => (
            <TextField
              label="Maturity Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...field}
              error={!!errors.maturityDate}
              helperText={errors.maturityDate?.message as any}
            />
          )}
        />
        <Button type="submit" variant="contained">
          Save
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="confirm-replace-title"
      >
        <DialogTitle id="confirm-replace-title">Confirm Replace</DialogTitle>
        <DialogContent>
          <Typography>
            {' '}
            A trade with the same Trade Id and Version already exists. Do you
            want to replace it?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmReplace} variant="contained">
            Replace
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
