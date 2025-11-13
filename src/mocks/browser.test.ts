/**
 * Simple tests for `src/mocks/browser.ts`.
 * We mock `msw`'s `setupWorker` so importing `browser.ts` is safe in Jest (Node).
 */

jest.mock('msw', () => ({
  setupWorker: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  // provide a minimal `rest` with factory methods so handlers can be defined
  rest: {
    get: () => ({ type: 'rest.get' }),
    post: () => ({ type: 'rest.post' }),
    put: () => ({ type: 'rest.put' }),
    delete: () => ({ type: 'rest.delete' }),
  },
}));

describe('mocks/browser', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates a worker using setupWorker and exports `worker`', () => {
    const msw = require('msw');
    const mockSetup = msw.setupWorker as jest.Mock;

    // isolate module import so our mock is applied before the file executes
    jest.isolateModules(() => {
      const { worker } = require('./browser');
      expect(worker).toBeDefined();
      // setupWorker should have been called
      expect(mockSetup).toHaveBeenCalled();
    });
  });
});
