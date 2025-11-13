import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import TradeFormPage from '../pages/TradeForm'
import { BrowserRouter } from 'react-router-dom'

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

test('shows validation error when maturity date is before today', async () => {
  renderWithRouter(<TradeFormPage />)

  const tradeId = screen.getByLabelText(/Trade Id/i)
  const version = screen.getByLabelText(/Version/i)
  const cp = screen.getByLabelText(/Counter-Party Id/i)
  const book = screen.getByLabelText(/Book-Id/i)
  const maturity = screen.getByLabelText(/Maturity Date/i)

  fireEvent.change(tradeId, { target: { value: 'TX' } })
  fireEvent.change(version, { target: { value: '1' } })
  fireEvent.change(cp, { target: { value: 'CP-1' } })
  fireEvent.change(book, { target: { value: 'B1' } })
  // set a past date
  fireEvent.change(maturity, { target: { value: '2000-01-01' } })

  fireEvent.click(screen.getByRole('button', { name: /save/i }))

  await waitFor(() => expect(screen.getByText(/Maturity must be today or later/i)).toBeInTheDocument())
})

test('blocks submission when lower version exists (server returns 409)', async () => {
  renderWithRouter(<TradeFormPage />)

  const tradeId = screen.getByLabelText(/Trade Id/i)
  const version = screen.getByLabelText(/Version/i)
  const cp = screen.getByLabelText(/Counter-Party Id/i)
  const book = screen.getByLabelText(/Book-Id/i)
  const maturity = screen.getByLabelText(/Maturity Date/i)

  // Use T2 v1 which is lower than existing T2 v2 in mock data
  fireEvent.change(tradeId, { target: { value: 'T2' } })
  fireEvent.change(version, { target: { value: '1' } }) // lower than existing
  fireEvent.change(cp, { target: { value: 'CP-1' } })
  fireEvent.change(book, { target: { value: 'B1' } })
  fireEvent.change(maturity, { target: { value: new Date().toISOString().slice(0,10) } })

  // intercept alert calls
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

  fireEvent.click(screen.getByRole('button', { name: /save/i }))

  await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('higher version exists')))

  alertSpy.mockRestore()
})

test('replace confirm -> clicking Replace dispatches upsert event', async () => {
  renderWithRouter(<TradeFormPage />)

  fireEvent.change(screen.getByLabelText(/Trade Id/i), { target: { value: 'T2' } })
  fireEvent.change(screen.getByLabelText(/Version/i), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText(/Counter-Party Id/i), { target: { value: 'CP-2' } })
  fireEvent.change(screen.getByLabelText(/Book-Id/i), { target: { value: 'B1' } })
  fireEvent.change(screen.getByLabelText(/Maturity Date/i), { target: { value: '2030-01-01' } })

  const dispatchSpy = jest.spyOn(window, 'dispatchEvent')

  fireEvent.click(screen.getByRole('button', { name: /save/i }))

  // wait for confirmation dialog
  await waitFor(() => screen.getByText(/Do you want to replace it\?/i))

  fireEvent.click(screen.getByRole('button', { name: /Replace/i }))

  await waitFor(() => expect(dispatchSpy).toHaveBeenCalled())

  dispatchSpy.mockRestore()
})
