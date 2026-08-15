import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerSettingsTools } from './settings.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_settings', () => {
  it('fetches profile settings', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { web3: false } }) });
    const { client, close } = await createTestClient(registerSettingsTools);

    const result = await client.callTool({
      arguments: { profile: 'abc123' },
      name: 'get_settings',
    });

    expect(result.isError).toBeFalsy();

    await close();
  });
});

describe('update_settings', () => {
  it('patches profile settings at the scoped endpoint', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: {} }) });
    const { client, close } = await createTestClient(registerSettingsTools);

    await client.callTool({
      arguments: { patch: { web3: true }, profile: 'abc123' },
      name: 'update_settings',
    });

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/settings');
    expect(init?.method).toBe('PATCH');

    await close();
  });
});
