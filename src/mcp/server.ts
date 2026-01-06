import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { get_schema } from "./tools/get-schema.js";
import { query } from "./tools/query.js";
import type { AuthInfo } from "../auth/jwt-validator.js";

export interface McpContext {
  authInfo: AuthInfo;
  userToken: string;
}

export function createMcpServer(context: McpContext) {
  const server = new McpServer(
    { name: "atomic-crm", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Register all tools
  for (const [name, tool] of Object.entries({ get_schema, query })) {
    server.registerTool(name, tool.definition, async (params: any) =>
      tool.handler(params, context)
    );
  }

  return server;
}
