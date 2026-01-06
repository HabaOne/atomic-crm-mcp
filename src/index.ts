import express from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { authMiddleware } from './auth/middleware.js';
import wellKnownRouter from './routes/well-known.js';
import { createMcpServer } from './mcp/server.js';
import type { Request, Response } from 'express';

const app = express();
app.use(express.json());

app.use('/.well-known', wellKnownRouter);

const transports: Map<string, { transport: StreamableHTTPServerTransport; userToken: string }> = new Map();

app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const authHeader = req.headers.authorization;
  const userToken = authHeader?.substring(7) || '';

  let transportInfo = sessionId ? transports.get(sessionId) : undefined;

  if (!transportInfo) {
    const server = createMcpServer({
      authInfo: req.auth,
      userToken,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    await server.connect(transport);

    transportInfo = { transport, userToken };
  }

  try {
    const nodeReq = req as unknown as IncomingMessage;
    const nodeRes = res as unknown as ServerResponse;

    await transportInfo.transport.handleRequest(nodeReq, nodeRes, req.body);

    // Store transport after first request when session ID is generated
    if (transportInfo.transport.sessionId && !sessionId) {
      transports.set(transportInfo.transport.sessionId, transportInfo);
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (sessionId && transports.has(sessionId)) {
    const transportInfo = transports.get(sessionId)!;
    await transportInfo.transport.close();
    transports.delete(sessionId);
  }

  res.status(200).json({ message: 'Session terminated' });
});

const server = app.listen(config.port, () => {
  console.log(`MCP Server running on ${config.mcpServerUrl}`);
  console.log(`Protected Resource Metadata: ${config.mcpServerUrl}/.well-known/oauth-protected-resource`);
  console.log(`Supabase Auth URL: ${config.supabase.authUrl}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  for (const transportInfo of transports.values()) {
    await transportInfo.transport.close();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
