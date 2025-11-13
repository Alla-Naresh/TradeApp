import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TradesList from '../pages/TradesList'
import { BrowserRouter } from 'react-router-dom'

test('export csv triggers download flow', async () => {
  render(
    <BrowserRouter>
      <TradesList />
    </BrowserRouter>
  )

  const createObjectURL = URL.createObjectURL
  const revokeObjectURL = (URL as any).revokeObjectURL
  const mockUrl = 'blob:mock'
  // mock createObjectURL and revokeObjectURL to avoid jsdom navigation errors
  // @ts-ignore
  URL.createObjectURL = jest.fn(() => mockUrl)
  // @ts-ignore
  URL.revokeObjectURL = jest.fn()
  // mock anchor click to prevent actual navigation in jsdom
  const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  await userEvent.click(screen.getByRole('button', { name: /export csv/i }))

  expect(URL.createObjectURL).toHaveBeenCalled()
  expect(clickSpy).toHaveBeenCalled()

  // restore
  // @ts-ignore
  URL.createObjectURL = createObjectURL
  // @ts-ignore
  URL.revokeObjectURL = revokeObjectURL
  clickSpy.mockRestore()
})
