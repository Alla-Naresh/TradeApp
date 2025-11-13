import React from 'react'
import { render, screen } from '@testing-library/react'
import TradesList from '../pages/TradesList'
import { BrowserRouter } from 'react-router-dom'

test('renders accessible controls', () => {
  render(
    <BrowserRouter>
      <TradesList />
    </BrowserRouter>
  )

  // export button is accessible
  expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  // datagrid should be present (role grid)
  expect(screen.getByRole('grid')).toBeInTheDocument()
})
