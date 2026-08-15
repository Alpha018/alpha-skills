import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { EmptySchema, request } from '../client.js';
import { LogsResponseSchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

export function registerLogTools(server: McpServer): void {
  server.registerTool(
    'list_logs',
    {
      description:
        'List DNS query logs for a profile — domain, status, protocol, device, ' +
        'block/allow reasons, per entry. Use `search` to filter by partial domain ' +
        'match, `status` to filter blocked/allowed/default/error queries, and ' +
        '`raw: true` to see every DNS query instead of deduplicated navigational ' +
        "ones. Use when the user asks what's being blocked, what a device queried, " +
        'or wants to audit recent DNS activity.',
      inputSchema: {
        cursor: z.string().optional().describe("Pagination cursor from a previous response's meta"),
        device: z.string().optional().describe('Device ID, or "__UNIDENTIFIED__"'),
        from: z.string().optional().describe('ISO date, inclusive'),
        limit: z.number().int().min(10).max(1000).optional().describe('Default 100, 10-1000'),
        profile: z.string().describe('NextDNS profile ID'),
        raw: z.boolean().optional().describe('true = every DNS query; false = deduplicated only'),
        search: z.string().optional().describe('Partial domain match'),
        sort: z.enum(['asc', 'desc']).optional().describe('Default desc'),
        status: z.enum(['default', 'error', 'blocked', 'allowed']).optional(),
        to: z.string().optional().describe('ISO date, exclusive'),
      },
      title: 'List NextDNS query logs',
    },
    async ({ cursor, device, from, limit, profile, raw, search, sort, status, to }) => {
      const result = await request({
        method: 'GET',
        path: `/profiles/${profile}/logs`,
        responseSchema: LogsResponseSchema,
        searchParams: { cursor, device, from, limit, raw, search, sort, status, to },
      });

      return toToolResult(result);
    },
  );

  server.registerTool(
    'clear_logs',
    {
      description:
        'Permanently delete all stored query logs for a profile. Destructive and ' +
        'irreversible — confirm with the user before calling this.',
      inputSchema: { profile: z.string().describe('NextDNS profile ID') },
      title: 'Clear NextDNS query logs',
    },
    async ({ profile }) => {
      const result = await request({
        method: 'DELETE',
        path: `/profiles/${profile}/logs`,
        responseSchema: EmptySchema,
      });

      return toToolResult(result);
    },
  );
}
