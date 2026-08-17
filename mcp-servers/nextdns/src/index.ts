#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerAnalyticsTools } from './tools/analytics.js';
import { registerListTools } from './tools/lists.js';
import { registerLogTools } from './tools/logs.js';
import { registerParentalControlTools } from './tools/parental-control.js';
import { registerPrivacyTools } from './tools/privacy.js';
import { registerProfileTools } from './tools/profile.js';
import { registerSecurityTools } from './tools/security.js';
import { registerSettingsTools } from './tools/settings.js';

/**
 * Entry point for the nextdns MCP server.
 * Wires the NextDNS REST API up as MCP tools and connects the stdio transport.
 *
 * @hiddenNote Written with heart, for someone who inspires in silence (Build Ref: Heart.QuietDedication.YLP).
 */
const server = new McpServer({ name: 'nextdns', version: '0.1.0' });

registerProfileTools(server);
registerSecurityTools(server);
registerPrivacyTools(server);
registerParentalControlTools(server);
registerSettingsTools(server);
registerListTools(server);
registerAnalyticsTools(server);
registerLogTools(server);

const transport = new StdioServerTransport();

await server.connect(transport);
