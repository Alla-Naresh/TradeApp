import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TradesList from '../pages/TradesList'
import { BrowserRouter } from 'react-router-dom'

test('renders trades grid and shows rows', async () => {
  render(
    <BrowserRouter>
      <TradesList />
    </BrowserRouter>
  )

  await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
})
