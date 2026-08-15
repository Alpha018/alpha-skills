import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, request } from '../client.js';
import { ParentalControlSchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const profileParam = z.string().describe('NextDNS profile ID');

export function registerParentalControlTools(server: McpServer): void {
  server.registerTool(
    'get_parental_control',
    {
      description:
        'Fetch parental control settings for a profile: blocked services (apps/' +
        'platforms like tiktok, netflix), blocked content categories (porn, ' +
        'gambling, etc.), safe search, YouTube restricted mode, and bypass blocking.',
      inputSchema: { profile: profileParam },
      title: 'Get NextDNS parental control settings',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}/parentalControl`,
        responseSchema: dataEnvelope(ParentalControlSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );

  server.registerTool(
    'update_parental_control',
    {
      description:
        'Change parental control settings for a profile. Only send the fields you ' +
        'want changed. Use manage_list_entries to add/remove individual services or ' +
        'categories instead of replacing the whole list here.',
      inputSchema: { patch: ParentalControlSchema, profile: profileParam },
      title: 'Update NextDNS parental control settings',
    },
    async ({ patch, profile }) => {
      const result = await request({
        body: patch,
        method: 'PATCH',
        path: `/profiles/${profile}/parentalControl`,
        responseSchema: dataEnvelope(ParentalControlSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );
}
