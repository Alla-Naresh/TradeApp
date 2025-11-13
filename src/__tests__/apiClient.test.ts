import { setBaseUrl, get, post } from '../services/apiClient';

describe('apiClient', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.resetModules();
  });

  it('handles a successful JSON GET', async () => {
    setBaseUrl('http://example.com');
    const mockJson = { hello: 'world' };
    global.fetch = jest.fn(async () => ({
      headers: { get: () => 'application/json' },
      ok: true,
      json: async () => mockJson,
    })) as any;

    const res = await get('/api/foo');
    expect(res).toEqual(mockJson);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/example.com/);
  });

  it('throws when content-type is not JSON and includes body/status', async () => {
    setBaseUrl('http://example.com');
    global.fetch = jest.fn(async () => ({
      headers: { get: () => 'text/html' },
      ok: false,
      status: 500,
      text: async () => '<html>oops</html>',
    })) as any;

    await expect(get('/api/foo')).rejects.toMatchObject({
      message: expect.stringContaining('Unexpected content-type'),
      body: '<html>oops</html>',
      status: 500,
    });
  });

  it('throws API Error with JSON error message and body when res.ok is false', async () => {
    setBaseUrl('http://example.com');
    const body = { error: 'bad input', details: { why: 'nope' } };
    global.fetch = jest.fn(async () => ({
      headers: { get: () => 'application/json' },
      ok: false,
      status: 400,
      json: async () => body,
    })) as any;

    await expect(get('/api/foo')).rejects.toMatchObject({
      message: 'bad input',
      body,
      status: 400,
    });
  });

  it('POST sends JSON body and returns JSON result', async () => {
    setBaseUrl('http://example.com');
    const payload = { a: 1 };
    const resp = { ok: true, result: 'ok' };
    global.fetch = jest.fn(async (_url: any, opts: any) => {
      // ensure content-type header and body are set
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(opts.body)).toEqual(payload);
      return {
        headers: { get: () => 'application/json' },
        ok: true,
        json: async () => resp,
      } as any;
    }) as any;

    const result = await post('/api/foo', payload);
    expect(result).toEqual(resp);
  });
});
