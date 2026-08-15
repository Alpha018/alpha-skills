import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, request } from '../client.js';
import { ProfileSchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const profileParam = z.string().describe('NextDNS profile ID (e.g. "abc123")');

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    'get_profile',
    {
      description:
        'Fetch the complete NextDNS profile — security, privacy, parental control, ' +
        'denylist/allowlist, and settings all nested in one response.',
      inputSchema: { profile: profileParam },
      title: 'Get NextDNS profile',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}`,
        responseSchema: dataEnvelope(ProfileSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );

  server.registerTool(
    'update_profile',
    {
      description:
        'Apply a partial update to a NextDNS profile. Only send the fields you want ' +
        'changed — this is a PATCH, not a full replace. Prefer the scoped tools ' +
        '(update_security, update_privacy, etc.) when only touching one area, to ' +
        'avoid accidentally clobbering unrelated fields.',
      inputSchema: {
        patch: ProfileSchema.describe('Partial profile object with only the fields to change'),
        profile: profileParam,
      },
      title: 'Update NextDNS profile',
    },
    async ({ patch, profile }) => {
      const result = await request({
        body: patch,
        method: 'PATCH',
        path: `/profiles/${profile}`,
        responseSchema: dataEnvelope(ProfileSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );
}
