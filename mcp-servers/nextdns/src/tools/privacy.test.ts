import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerPrivacyTools } from './privacy.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_privacy', () => {
  it('fetches privacy settings for a profile', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { allowAffiliate: false } }) });
    const { client, close } = await createTestClient(registerPrivacyTools);

    const result = await client.callTool({ arguments: { profile: 'abc123' }, name: 'get_privacy' });

    expect(result.isError).toBeFalsy();

    await close();
  });
});

describe('update_privacy', () => {
  it('patches privacy settings at the scoped endpoint', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: {} }) });
    const { client, close } = await createTestClient(registerPrivacyTools);

    await client.callTool({
      arguments: { patch: { allowAffiliate: true }, profile: 'abc123' },
      name: 'update_privacy',
    });

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/privacy');
    expect(init?.method).toBe('PATCH');

    await close();
  });
});
