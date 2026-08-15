import { jest } from '@jest/globals';

type MockFetchOptions = {
  bodyText?: string;
  ok?: boolean;
  status?: number;
};

export function mockFetchOnce(options: MockFetchOptions = {}): jest.SpiedFunction<typeof fetch> {
  const bodyText = options.bodyText ?? '';
  const status = options.status ?? 200;
  const ok = options.ok ?? status < 400;
  const spy = jest.spyOn(globalThis, 'fetch');

  spy.mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(bodyText),
  } as Response);

  return spy;
}

// fetch's overloaded signature defeats jest-mock's call-tuple inference (comes back as `any`)
export function lastFetchCall(
  spy: jest.SpiedFunction<typeof fetch>,
): [URL, RequestInit | undefined] {
  const call = spy.mock.calls.at(-1) as [URL, RequestInit | undefined] | undefined;

  if (!call) throw new Error('fetch was not called');

  return call;
}
