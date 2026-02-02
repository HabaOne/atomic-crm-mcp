# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev                                      # Development with hot reload
npm run dev -- --url=https://abc123.ngrok.io     # Override URL (for ngrok HTTPS testing)
npm run typecheck                                # Type check before committing
npm run build && npm start                       # Production build and run
```

## Architecture

MCP server with OAuth 2.1 authentication via Supabase. Key pattern: **RLS enforcement through PostgreSQL session variables**.

### Core Flow

1. JWT validated against Supabase JWKS (`src/auth/middleware.ts`)
2. For each query, session variables set to impersonate user:
   - `SET LOCAL role = 'authenticated'`
   - `SET LOCAL request.jwt.claims = '<json>'`
3. RLS policies use `auth.uid()` to filter data per user

### Code Structure

```
src/mcp/tools/          # Each tool = { definition, handler }
src/mcp/server.ts       # Registers all tools dynamically
src/auth/               # JWT validation + OAuth metadata
```

## Key Implementation Notes

- **Connection**: Uses `pg.Pool` with direct connection (port 5432)
- **Transactions**: Each query wrapped in `BEGIN`/`COMMIT`/`ROLLBACK`
- **SET commands**: Don't support parameterized queries - escape with `''`
- **Schema queries**: Use `pg_catalog` tables (not `information_schema` - RLS restricted)
- **ngrok**: Use `--url=` flag to override without editing `.env`

## Environment Variables

```bash
SUPABASE_URL=https://xxx.supabase.co  # For JWKS (auth)
DATABASE_URL=postgresql://...          # Direct connection (data)
```

## Adding New MCP Tools

1. Create file in `src/mcp/tools/` exporting `{ definition, handler }`
2. Definition uses Zod schema for `inputSchema`
3. Handler receives `(params, context: McpContext)` where context has `authInfo` and `userToken`
4. Add export to `src/mcp/server.ts` tool registration object
5. Use `executeQuery()` from `query.ts` to run SQL with RLS enforcement
