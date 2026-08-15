import { describe, expect, it } from '@jest/globals';

import { toToolResult } from './tool-result.js';

describe('toToolResult', () => {
  it('serializes data as pretty-printed JSON on success', () => {
    const result = toToolResult({ data: { id: 'abc123', name: 'home' }, ok: true });

    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([
      { text: JSON.stringify({ id: 'abc123', name: 'home' }, null, 2), type: 'text' },
    ]);
  });

  it('formats the status and message as an error result', () => {
    const result = toToolResult({ error: { message: 'not found', status: 404 }, ok: false });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe('NextDNS API error (404): not found');
  });
});
