import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { request } from '../client.js';
import { AnalyticsResponseSchema } from '../schemas.js';
import { toToolResult } from '../tool-result.js';

const DIMENSIONS = [
  'status',
  'domains',
  'reasons',
  'ips',
  'devices',
  'protocols',
  'queryTypes',
  'ipVersions',
  'dnssec',
  'encryption',
  'destinations',
] as const;

export function registerAnalyticsTools(server: McpServer): void {
  server.registerTool(
    'get_analytics',
    {
      description:
        'Query DNS query analytics for a profile, broken down by dimension: ' +
        'status (default/blocked/allowed), domains queried, block/allow reasons, ' +
        'client IPs, devices, protocols (DoH/DoT/UDP), DNS query types, IP ' +
        'versions, DNSSEC validation, encryption, or destinations (by country or ' +
        'GAFAM company). Set `series: true` to get the same dimension broken into ' +
        'time buckets instead of a single total.',
      inputSchema: {
        device: z.string().optional().describe('Filter to one device ID'),
        dimension: z.enum(DIMENSIONS),
        from: z.string().optional().describe('ISO date, inclusive'),
        interval: z
          .string()
          .optional()
          .describe(
            'Time bucket size (seconds or duration string) — only used when series is true',
          ),
        limit: z.number().int().min(1).max(500).optional().describe('Default 10, max 500'),
        profile: z.string().describe('NextDNS profile ID'),
        series: z.boolean().optional().describe('Return a time series instead of a single total'),
        to: z.string().optional().describe('ISO date, exclusive'),
      },
      title: 'Get NextDNS analytics',
    },
    async ({ device, dimension, from, interval, limit, profile, series, to }) => {
      const path = `/profiles/${profile}/analytics/${dimension}${series ? ';series' : ''}`;
      const result = await request({
        method: 'GET',
        path,
        responseSchema: AnalyticsResponseSchema,
        searchParams: { device, from, interval, limit, to },
      });

      return toToolResult(result);
    },
  );
}
