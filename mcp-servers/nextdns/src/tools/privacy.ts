import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, request } from '../client.js';
import { PrivacySchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const profileParam = z.string().describe('NextDNS profile ID');

export function registerPrivacyTools(server: McpServer): void {
  server.registerTool(
    'get_privacy',
    {
      description:
        'Fetch privacy settings for a profile: third-party tracker/ad blocklists, ' +
        'OS/vendor-native telemetry blockers, disguised-tracker (CNAME cloaking) ' +
        'blocking, and affiliate-link handling.',
      inputSchema: { profile: profileParam },
      title: 'Get NextDNS privacy settings',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}/privacy`,
        responseSchema: dataEnvelope(PrivacySchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );

  server.registerTool(
    'update_privacy',
    {
      description: 'Change privacy settings for a profile. Only send the fields you want changed.',
      inputSchema: { patch: PrivacySchema, profile: profileParam },
      title: 'Update NextDNS privacy settings',
    },
    async ({ patch, profile }) => {
      const result = await request({
        body: patch,
        method: 'PATCH',
        path: `/profiles/${profile}/privacy`,
        responseSchema: dataEnvelope(PrivacySchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );
}
