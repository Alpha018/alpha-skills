import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';

import { dataEnvelope, EmptySchema, request } from './client.js';
import { lastFetchCall, mockFetchOnce } from './test-utils/mock-fetch.js';

const ORIGINAL_ENV = process.env['NEXTDNS_API_KEY'];

beforeEach(() => {
  process.env['NEXTDNS_API_KEY'] = 'test-key';
});

afterEach(() => {
  process.env['NEXTDNS_API_KEY'] = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe('request', () => {
  it('returns parsed data on a successful response', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { name: 'home' } }) });

    const result = await request({
      method: 'GET',
      path: '/profiles/abc123',
      responseSchema: dataEnvelope(z.object({ name: z.string() })),
    });

    expect(result).toEqual({ data: { data: { name: 'home' } }, ok: true });
  });

  it('sends the API key header and JSON body on write requests', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: {} }) });

    await request({
      body: { csam: true },
      method: 'PATCH',
      path: '/profiles/abc123/security',
      responseSchema: dataEnvelope(z.record(z.string(), z.unknown())),
    });

    const [url, init] = lastFetchCall(fetchSpy);

    expect(url.toString()).toBe('https://api.nextdns.io/profiles/abc123/security');
    expect(init?.method).toBe('PATCH');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Api-Key': 'test-key',
    });
    expect(init?.body).toBe(JSON.stringify({ csam: true }));
  });

  it('omits Content-Type and body when there is no request body', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: [] }) });

    await request({
      method: 'GET',
      path: '/profiles/abc123/denylist',
      responseSchema: dataEnvelope(z.array(z.unknown())),
    });

    const [, init] = lastFetchCall(fetchSpy);

    expect(init?.headers).not.toHaveProperty('Content-Type');
    expect(init?.body).toBeUndefined();
  });

  it('appends only the defined search params', async () => {
    const fetchSpy = mockFetchOnce({ bodyText: JSON.stringify({ data: [] }) });

    await request({
      method: 'GET',
      path: '/profiles/abc123/logs',
      responseSchema: dataEnvelope(z.array(z.unknown())),
      searchParams: { cursor: undefined, limit: 10, raw: false },
    });

    const [url] = lastFetchCall(fetchSpy);

    expect(url.toString()).toContain('limit=10');
    expect(url.toString()).toContain('raw=false');
    expect(url.toString()).not.toContain('cursor');
  });

  it('parses null/empty bodies for delete-style responses', async () => {
    mockFetchOnce({ bodyText: '' });

    const result = await request({
      method: 'DELETE',
      path: '/profiles/abc123/logs',
      responseSchema: EmptySchema,
    });

    expect(result).toEqual({ data: null, ok: true });
  });

  it('rejects when NEXTDNS_API_KEY is not set', async () => {
    delete process.env['NEXTDNS_API_KEY'];

    await expect(
      request({
        method: 'GET',
        path: '/profiles/abc123',
        responseSchema: dataEnvelope(z.unknown()),
      }),
    ).rejects.toThrow(/NEXTDNS_API_KEY is not set/);
  });

  it('surfaces the API-provided error detail on a non-ok response', async () => {
    mockFetchOnce({
      bodyText: JSON.stringify({ errors: [{ code: 'authRequired', detail: 'auth required' }] }),
      ok: false,
      status: 403,
    });

    const result = await request({
      method: 'GET',
      path: '/profiles/abc123',
      responseSchema: dataEnvelope(z.unknown()),
    });

    expect(result).toEqual({
      error: { message: 'auth required', status: 403 },
      ok: false,
    });
  });

  it('falls back to raw text when the error body is not JSON', async () => {
    mockFetchOnce({ bodyText: 'internal server error', ok: false, status: 500 });

    const result = await request({
      method: 'GET',
      path: '/profiles/abc123',
      responseSchema: dataEnvelope(z.unknown()),
    });

    expect(result).toEqual({
      error: { message: 'internal server error', status: 500 },
      ok: false,
    });
  });

  it('returns a validation error when the response does not match the schema', async () => {
    mockFetchOnce({ bodyText: JSON.stringify({ data: { name: 42 } }) });

    const result = await request({
      method: 'GET',
      path: '/profiles/abc123',
      responseSchema: dataEnvelope(z.object({ name: z.string() })),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/did not match the expected shape/);
    }
  });
});
