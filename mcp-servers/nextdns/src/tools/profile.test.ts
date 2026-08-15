import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { lastFetchCall, mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerProfileTools } from './profile.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('get_profile', () => {
  it('fetches the profile and unwraps the data envelope', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { id: 'abc123', name: 'home' } }) });
    const { client, close } = await createTestClient(registerProfileTools);

    const result = await client.callTool({
      arguments: { profile: 'abc123' },
      name: 'get_profile',
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([
      { text: JSON.stringify({ id: 'abc123', name: 'home' }, null, 2), type: 'text' },
    ]);

    await close();
  });

  it('surfaces an API error as an isError tool result', async () => {
    mockFetchOnce({
      bodyText: JSON.stringify({ errors: [{ detail: 'profile not found' }] }),
      ok: false,
      status: 404,
    });
    const { client, close } = await createTestClient(registerProfileTools);

    const result = await client.callTool({
      arguments: { profile: 'missing' },
      name: 'get_profile',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { text: 'NextDNS API error (404): profile not found', type: 'text' },
    ]);

    await close();
  });
});

describe('update_profile', () => {
  it('sends the patch body and returns the updated profile', async () => {
    const fetchSpy = mockFetchOnce({
      bodyText: JSON.stringify({ data: { id: 'abc123', name: 'renamed' } }),
    });
    const { client, close } = await createTestClient(registerProfileTools);

    await client.callTool({
      arguments: { patch: { name: 'renamed' }, profile: 'abc123' },
      name: 'update_profile',
    });

    const [, init] = lastFetchCall(fetchSpy);

    expect(init?.method).toBe('PATCH');
    expect(init?.body).toBe(JSON.stringify({ name: 'renamed' }));

    await close();
  });
});
