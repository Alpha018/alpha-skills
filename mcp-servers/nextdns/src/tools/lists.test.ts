import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTestClient } from '../test-utils/mcp-harness.js';
import { mockFetchOnce } from '../test-utils/mock-fetch.js';
import { registerListTools } from './lists.js';

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  delete process.env['NEXTDNS_API_KEY'];
  jest.restoreAllMocks();
});

describe('manage_list_entries', () => {
  it('lists entries for a supported list type', async () => {
    mockFetchOnce({
      bodyText: JSON.stringify({ data: [{ active: true, id: 'ads.example.com' }] }),
    });
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: { action: 'list', list: 'denylist', profile: 'abc123' },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([
      { text: JSON.stringify([{ active: true, id: 'ads.example.com' }], null, 2), type: 'text' },
    ]);

    await close();
  });

  it('rejects add without an entry', async () => {
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: { action: 'add', list: 'denylist', profile: 'abc123' },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { text: expect.stringContaining('requires `entry`'), type: 'text' },
    ]);

    await close();
  });

  it('rejects remove without an entryId', async () => {
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: { action: 'remove', list: 'allowlist', profile: 'abc123' },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { text: expect.stringContaining('requires `entryId`'), type: 'text' },
    ]);

    await close();
  });

  it('rejects replace on a list that only supports per-item mutation', async () => {
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: {
        action: 'replace',
        entries: [{ id: 'ru' }],
        list: 'security_tlds',
        profile: 'abc123',
      },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { text: expect.stringContaining("does not support 'replace'"), type: 'text' },
    ]);

    await close();
  });

  it('replaces the whole list for a list type that supports it', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: [{ id: 'malware.example.com' }] }) });
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: {
        action: 'replace',
        entries: [{ id: 'malware.example.com' }],
        list: 'allowlist',
        profile: 'abc123',
      },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBeFalsy();

    await close();
  });

  it('rejects a list value outside the supported enum', async () => {
    const { client, close } = await createTestClient(registerListTools);

    const result = await client.callTool({
      arguments: { action: 'list', list: 'not-a-real-list', profile: 'abc123' },
      name: 'manage_list_entries',
    });

    expect(result.isError).toBe(true);

    await close();
  });
});
