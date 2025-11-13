import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { resetTrades } from './mocks/handlers';

// Establish API mocking before all tests.
// Opt-in to React Router v7 future flags to silence test warnings about
// upcoming behavior changes. These keys are read by react-router's
// deprecation logger during test renders.
try {
  localStorage.setItem('v7_startTransition', 'enabled');
  localStorage.setItem('v7_relativeSplatPath', 'enabled');
} catch (_e) {
  // localStorage may not be available in some environments; ignore.
}

beforeAll(() => server.listen());
// reset mocked data state between tests so module-level mocks don't leak
beforeEach(() => resetTrades());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// polyfill fetch for node environment using undici (provides WHATWG streams + Request)
// undici depends on global TextEncoder/TextDecoder in some environments
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
import { fetch as undiciFetch, Request, Response, Headers } from 'undici';
(global as any).fetch = undiciFetch;
(global as any).Request = Request;
(global as any).Response = Response;
(global as any).Headers = Headers;
