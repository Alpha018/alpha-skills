import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, request } from '../client.js';
import { SettingsSchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const profileParam = z.string().describe('NextDNS profile ID');

export function registerSettingsTools(server: McpServer): void {
  server.registerTool(
    'get_settings',
    {
      description:
        'Fetch profile-level settings: log retention/anonymization/storage region, ' +
        'block page, performance (EDNS client subnet, cache boost, CNAME ' +
        'flattening), and web3 domain resolution.',
      inputSchema: { profile: profileParam },
      title: 'Get NextDNS profile settings',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}/settings`,
        responseSchema: dataEnvelope(SettingsSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );

  server.registerTool(
    'update_settings',
    {
      description: 'Change profile-level settings. Only send the fields you want changed.',
      inputSchema: { patch: SettingsSchema, profile: profileParam },
      title: 'Update NextDNS profile settings',
    },
    async ({ patch, profile }) => {
      const result = await request({
        body: patch,
        method: 'PATCH',
        path: `/profiles/${profile}/settings`,
        responseSchema: dataEnvelope(SettingsSchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );
}
