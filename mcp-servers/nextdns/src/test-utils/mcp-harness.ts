import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// wires a real McpServer + Client pair over an in-memory transport so tests
// exercise the actual registered tool (schema validation included), not a
// hand-extracted handler function
export async function createTestClient(
  register: (server: McpServer) => void,
): Promise<{ client: Client; close: () => Promise<void> }> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });

  register(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
