import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerAnalyticsTools } from './analytics.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_analytics', () => {
  it('queries the given dimension', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: [{ queries: 42, status: 'blocked' }] }) });
    const { client, close } = await createTestClient(registerAnalyticsTools);

    const result = await client.callTool({
      arguments: { dimension: 'status', profile: 'abc123' },
      name: 'get_analytics',
    });

    expect(result.isError).toBeFalsy();

    await close();
  });

  it('appends ;series to the path when series is requested', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: [] }) });
    const { client, close } = await createTestClient(registerAnalyticsTools);

    await client.callTool({
      arguments: { dimension: 'domains', profile: 'abc123', series: true },
      name: 'get_analytics',
    });

    const [url] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/analytics/domains;series');

    await close();
  });

  it('rejects a dimension outside the supported enum', async () => {
    const { client, close } = await createTestClient(registerAnalyticsTools);

    const result = await client.callTool({
      arguments: { dimension: 'not-a-real-dimension', profile: 'abc123' },
      name: 'get_analytics',
    });

    expect(result.isError).toBe(true);

    await close();
  });
});
