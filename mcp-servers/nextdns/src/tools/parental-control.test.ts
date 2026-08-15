import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerParentalControlTools } from './parental-control.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_parental_control', () => {
  it('fetches parental control settings for a profile', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { safeSearch: true } }) });
    const { client, close } = await createTestClient(registerParentalControlTools);

    const result = await client.callTool({
      arguments: { profile: 'abc123' },
      name: 'get_parental_control',
    });

    expect(result.isError).toBeFalsy();

    await close();
  });
});

describe('update_parental_control', () => {
  it('patches parental control settings at the scoped endpoint', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: {} }) });
    const { client, close } = await createTestClient(registerParentalControlTools);

    await client.callTool({
      arguments: { patch: { safeSearch: true }, profile: 'abc123' },
      name: 'update_parental_control',
    });

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/parentalControl');
    expect(init?.method).toBe('PATCH');

    await close();
  });
});
