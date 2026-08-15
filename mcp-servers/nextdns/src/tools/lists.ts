import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { dataEnvelope, EmptySchema, request } from '../client.js';
import { ListEntrySchema } from '../schemas.js';
import { type ToolResult, toToolResult } from '../tool-result.js';

// one tool instead of 7 near-identical ones — every list-type sub-resource shares this CRUD shape
const LIST_TYPES = [
  'denylist',
  'allowlist',
  'security_tlds',
  'privacy_blocklists',
  'privacy_natives',
  'parental_control_services',
  'parental_control_categories',
] as const;

type ListType = (typeof LIST_TYPES)[number];

// only denylist/allowlist/parental-control lists support PUT replace — real API constraint, not an oversight
const LIST_CONFIG: Record<
  ListType,
  { path: (profile: string) => string; supportsReplace: boolean }
> = {
  allowlist: { path: (p) => `/profiles/${p}/allowlist`, supportsReplace: true },
  denylist: { path: (p) => `/profiles/${p}/denylist`, supportsReplace: true },
  parental_control_categories: {
    path: (p) => `/profiles/${p}/parentalControl/categories`,
    supportsReplace: true,
  },
  parental_control_services: {
    path: (p) => `/profiles/${p}/parentalControl/services`,
    supportsReplace: true,
  },
  privacy_blocklists: { path: (p) => `/profiles/${p}/privacy/blocklists`, supportsReplace: false },
  privacy_natives: { path: (p) => `/profiles/${p}/privacy/natives`, supportsReplace: false },
  security_tlds: { path: (p) => `/profiles/${p}/security/tlds`, supportsReplace: false },
};

const ACTIONS = ['list', 'add', 'update', 'remove', 'replace'] as const;

function errorResult(text: string): ToolResult {
  return { content: [{ text, type: 'text' }], isError: true };
}

export function registerListTools(server: McpServer): void {
  server.registerTool(
    'manage_list_entries',
    {
      description:
        "Read or mutate one of NextDNS's list-type sub-resources: denylist, " +
        'allowlist, the blocked-TLD list, the privacy blocklists/native trackers, ' +
        'or the parental-control services/categories lists. `action` selects the ' +
        "operation: 'list' (read all entries), 'add' (one entry, needs `entry`), " +
        "'update' (toggle `active` on one entry, needs `entryId` + `entry`), " +
        "'remove' (delete one entry, needs `entryId`), or 'replace' (overwrite the " +
        'whole list, needs `entries` — only supported for denylist, allowlist, and ' +
        'the parental-control lists).',
      inputSchema: {
        action: z.enum(ACTIONS),
        entries: z.array(ListEntrySchema).optional().describe("Required for 'replace'"),
        entry: ListEntrySchema.optional().describe("Required for 'add' and 'update'"),
        entryId: z.string().optional().describe("Required for 'update' and 'remove'"),
        list: z.enum(LIST_TYPES).describe('Which list to operate on'),
        profile: z.string().describe('NextDNS profile ID'),
      },
      title: 'Manage a NextDNS list (denylist, allowlist, blocklists, etc.)',
    },
    async ({ action, entries, entry, entryId, list, profile }) => {
      // list comes from the zod enum above, not arbitrary user input
      // eslint-disable-next-line security/detect-object-injection
      const config = LIST_CONFIG[list];
      const basePath = config.path(profile);

      switch (action) {
        case 'add': {
          if (!entry) return errorResult("action 'add' requires `entry` ({id, active?}).");
          const result = await request({
            body: entry,
            method: 'POST',
            path: basePath,
            responseSchema: dataEnvelope(ListEntrySchema),
          });

          return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
        }

        case 'list': {
          const result = await request({
            method: 'GET',
            path: basePath,
            responseSchema: dataEnvelope(z.array(ListEntrySchema)),
          });

          return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
        }

        case 'remove': {
          if (!entryId) return errorResult("action 'remove' requires `entryId`.");
          const result = await request({
            method: 'DELETE',
            path: `${basePath}/${entryId}`,
            responseSchema: EmptySchema,
          });

          return toToolResult(result);
        }

        case 'replace': {
          if (!config.supportsReplace) {
            return errorResult(
              `List '${list}' does not support 'replace' — only denylist, allowlist, ` +
                "and the parental-control lists support a full replace. Use 'add'/" +
                "'remove' per entry instead.",
            );
          }
          if (!entries) return errorResult("action 'replace' requires `entries`.");
          const result = await request({
            body: entries,
            method: 'PUT',
            path: basePath,
            responseSchema: dataEnvelope(z.array(ListEntrySchema)),
          });

          return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
        }

        case 'update': {
          if (!entryId) return errorResult("action 'update' requires `entryId`.");
          if (!entry)
            return errorResult("action 'update' requires `entry` with the fields to change.");
          const result = await request({
            body: entry,
            method: 'PATCH',
            path: `${basePath}/${entryId}`,
            responseSchema: dataEnvelope(ListEntrySchema),
          });

          return toToolResult(result.ok ? { data: result.data.data, ok: true } : result);
        }

        default: {
          const exhaustive: never = action;

          return errorResult(`Unhandled action: ${String(exhaustive)}`);
        }
      }
    },
  );
}
