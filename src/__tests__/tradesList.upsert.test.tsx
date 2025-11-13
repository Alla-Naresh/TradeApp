import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import TradesList from '../pages/TradesList';
import { BrowserRouter } from 'react-router-dom';

test('updates list when trade:upserted event fired', async () => {
  render(
    <BrowserRouter>
      <TradesList />
    </BrowserRouter>
  );

  // Dispatch a new trade upsert event
  const newTrade = {
    tradeId: 'TX',
    version: 1,
    counterPartyId: 'CP-X',
    bookId: 'B-X',
    maturityDate: '2030-01-01',
    createdDate: '2030-01-01',
    expired: 'N',
  };
  act(() => {
    window.dispatchEvent(
      new CustomEvent('trade:upserted', {
        detail: { trade: newTrade, replaced: false },
      })
    );
  });

  // Expect the grid to show the new trade id (findByText waits)
  expect(await screen.findByText(/TX/)).toBeInTheDocument();
});
