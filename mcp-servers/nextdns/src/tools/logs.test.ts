import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerLogTools } from './logs.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('list_logs', () => {
  it('lists logs with the given filters as query params', async () => {
    const fetchSpy = mockFetchOnce({
      bodyText: JSON.stringify({
        data: [{ domain: 'example.com', timestamp: '2024-01-01T00:00:00Z' }],
      }),
    });
    const { client, close } = await createTestClient(registerLogTools);

    const result = await client.callTool({
      arguments: { profile: 'abc123', search: 'example', status: 'blocked' },
      name: 'list_logs',
    });

    expect(result.isError).toBeFalsy();

    const [url] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/logs');
    expect(url.searchParams.get('search')).toBe('example');
    expect(url.searchParams.get('status')).toBe('blocked');

    await close();
  });
});

describe('clear_logs', () => {
  it('sends a DELETE request to the logs endpoint', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: '' });
    const { client, close } = await createTestClient(registerLogTools);

    const result = await client.callTool({ arguments: { profile: 'abc123' }, name: 'clear_logs' });

    expect(result.isError).toBeFalsy();

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/logs');
    expect(init?.method).toBe('DELETE');

    await close();
  });
});
