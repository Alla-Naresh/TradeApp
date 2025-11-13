/**
 * Simple tests for `src/mocks/server.ts`.
 * We mock `msw/node`'s `setupServer` so importing `server.ts` is explicit and testable.
 */

jest.mock('msw/node', () => ({
  setupServer: jest.fn(() => ({
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  })),
}));

describe('mocks/server', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates a server using setupServer and exports `server`', () => {
    const nodeMsw = require('msw/node');
    const mockSetupServer = nodeMsw.setupServer as jest.Mock;

    jest.isolateModules(() => {
      const { server } = require('./server');
      expect(server).toBeDefined();
      expect(mockSetupServer).toHaveBeenCalled();
    });
  });
});
