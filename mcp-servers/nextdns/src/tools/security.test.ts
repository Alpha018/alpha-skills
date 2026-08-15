import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerSecurityTools } from './security.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_security', () => {
  it('fetches security settings for a profile', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { csam: true } }) });
    const { client, close } = await createTestClient(registerSecurityTools);

    const result = await client.callTool({
      arguments: { profile: 'abc123' },
      name: 'get_security',
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([
      { text: JSON.stringify({ csam: true }, null, 2), type: 'text' },
    ]);

    await close();
  });
});

describe('update_security', () => {
  it('patches security settings at the scoped endpoint', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: { csam: true } }) });
    const { client, close } = await createTestClient(registerSecurityTools);

    await client.callTool({
      arguments: { patch: { csam: true }, profile: 'abc123' },
      name: 'update_security',
    });

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.pathname).toBe('/profiles/abc123/security');
    expect(init?.method).toBe('PATCH');

    await close();
  });
});
