import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, request } from '../client.js';
import { SecuritySchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const profileParam = z.string().describe('NextDNS profile ID');

export function registerSecurityTools(server: McpServer): void {
  server.registerTool(
    'get_security',
    {
      description:
        'Fetch the threat-detection toggles for a profile (threat intelligence, ' +
        'AI threat detection, Google Safe Browsing, cryptojacking, DNS rebinding, ' +
        'IDN homographs, typosquatting, DGA, newly-registered domains, dynamic DNS, ' +
        'domain parking, CSAM blocklist) plus the blocked TLD list.',
      inputSchema: { profile: profileParam },
      title: 'Get NextDNS security settings',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}/security`,
        responseSchema: dataEnvelope(SecuritySchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );

  server.registerTool(
    'update_security',
    {
      description:
        'Toggle security/threat-detection settings for a profile. Only send the ' +
        'fields you want changed.',
      inputSchema: { patch: SecuritySchema, profile: profileParam },
      title: 'Update NextDNS security settings',
    },
    async ({ patch, profile }) => {
      const result = await request({
        body: patch,
        method: 'PATCH',
        path: `/profiles/${profile}/security`,
        responseSchema: dataEnvelope(SecuritySchema),
      });

      return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
    },
  );
}
