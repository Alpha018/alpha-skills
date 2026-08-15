import type { ApiResult } from './client.js';

/** MCP tool return shape, kept local so tool files don't import SDK response types directly. */
export type ToolResult = {
  content: Array<{ text: string; type: 'text' }>;
  isError?: boolean;
};

export function toToolResult<T>(result: ApiResult<T>): ToolResult {
  if (!result.ok) {
    return {
      content: [
        {
          text: `NextDNS API error (${result.error.status}): ${result.error.message}`,
          type: 'text',
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ text: JSON.stringify(result.data, null, 2), type: 'text' }],
  };
}
