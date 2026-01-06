# Atomic CRM MCP Server

An MCP (Model Context Protocol) server for [Atomic CRM](https://marmelab.com/atomic-crm/). It enables an agent (e.g. Claude Desktop) to read and write data to your Atomic CRM instance securely.

![./assets/screenshot.png](./assets/screenshot.png)

- OAuth 2.1 authentication with Supabase
- Adds a `query` tool for executing SQL against CRM database
- Row Level Security (RLS) automatically enforced

## Supported MCP Clients

- Visual Studio Code
- Claude Desktop
- Claude Code
- ~~Claude Mobile~~
- ~~ChatGPT Desktop~~
- ~~ChatGPT Mobile~~

## Installation

### MCP Server Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/marmelab/atomic-crm-mcp
    cd your-repo
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Add a config file
   ```bash
   cp .env.example .env
    ```

### Supabase Setup

1. Open the Supabase Dashboard
   - Go to https://supabase.com/dashboard and select your project (or create a new one)

2. Enable OAuth 2.1 Server
   - Go to **Authentication** → **OAuth Server**
   - Enable OAuth 2.1

3. Configure asymmetric JWT signing
   - Go to **Project Settings** → **JWT Keys**
   - Enable JWT Signing Keys
   - Rotate keys if the current key uses HS256
   - The current key should be of type "ECC (P256)" or similar, NOT "Legacy HS256 (Shared Secret)"

4. Get your Supabase URL
   - Go to **Project Settings** → **Data API**
   - Find your **Project URL** (e.g., `https://mrubnlemopavyqvjjwmw.supabase.co`)
   - Add it to your `.env` file as `SUPABASE_URL`

5. Get your database connection string
   - Go to **Project Settings** → **Database**
   - On the top app bar, click on the **Connect** button
   - Copy the **Direct Connection** string (it will have `[YOUR-PASSWORD]` placeholder)
   - Add it to your `.env` file as `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` with your database password. If you don't know it, go to **Database** → **Settings** and reset the password.

### Local MCP Server

You can run the MCP server locally if you use a service like ngrok. You will need to choose a publicly accessible HTTPS URL for the MCP server, e.g., `https://atomiccrmmcp.ngrok.dev`. We'll name this URL `MCP_URL` in the instructions below.

Run the server with the custom URL:

```bash
npm run dev -- --url=MCP_URL
```

Then, start ngrok in a separate terminal with the same URL:

```bash
ngrok http --url MCP_URL 3000   
```

Now the MCP server is accessible at the ngrok URL.

### Hosted MCP Server

Deploy the MCP server to a hosting provider of your choice. Make sure to set the environment variables from your `.env` file in the hosting provider's settings.

Note that the host must support IPV6, as Supabase Direct Database connection doesn't support IPV4. This expludes IPV4-only providers like Vercel or GitHub actions. 

### Adding the MCP server to Visual Studio Code

1. Open the command palette (Ctrl+Shift+P or Cmd+Shift+P) and run the "MCP: Add Server..." command.
2. In the dropdown listing MCP types, choose "HTTP"
3. Enter the MCP server URL (e.g., `MCP_URL/mcp`) when prompted.
4. Name this server `atomic-crm` when prompted.
5. Choose "Global" or "Local" scope as desired.
6. A Dialog opens for you to authenticate to Atomic CRM and allow access. Click "Allow".
7. A browser window opens for you to authenticate to Atomic CRM and allow access to Claude Code.
8. Once authenticated, you can start using the Atomic CRM extension in Visual Studio Code

### Adding The MCP Server To Claude Desktop

1. Navigate to Settings > Extensions on Claude Desktop.
2. Click on "Add a custom Extension".
3. Fill in the fields as follows:
    - Name: Atomic CRM
    - URL: (your MCP Server URL, e.g., `MCP_URL/mcp`)
4. Click "Add".
5. The new extension should now appear in your list of extensions. Click on "Connect" to start using it.
6. A browser window opens for you to authenticate to Atomic CRM and allow access to Claude.
7. Once authenticated, you can start using the Atomic CRM extension in Claude.

### Adding the MCP server to Claude Code

1. Add the Atomic CRM MCP server to Claude Code by running the following command in your terminal:
    ```bash
    claude mcp add atomic-crm --transport http MCP_URL/mcp
    ```

2. Open Claude Code 
    ```bash
    claude
    ```

3. List the available MCP servers
    ```bash
    /mcp
    ```

4. The `atomic-crm` server should appear as "needs authentication". Press Enter to authenticate.
5. A browser window opens for you to authenticate to Atomic CRM and allow access to Claude Code.
6. Once authenticated, you can start using the Atomic CRM extension in Claude Code.

## Architecture

### MCP Tools

- `get_schema`: Retrieves the database schema to help construct accurate SQL queries, including foreign key relationships for JOINs.
- `query`: Executes SQL queries against the CRM database with RLS enforcement. Supports complex queries including JOINs.

### Security

- **JWT Validation**: All tokens validated against Supabase JWKS
- **RLS Enforcement**: Queries run with user's JWT, `auth.uid()` available in SQL
- **Session Management**: Cryptographically secure session IDs
- **HTTPS Required**: Must use HTTPS in production
- **Token Storage**: Tokens only kept in memory, never logged

### OAuth Flow

1. MCP client connects without auth → Server returns 401 with Protected Resource Metadata URL
2. Client discovers OAuth endpoints from Protected Resource Metadata
3. Client fetches Supabase's OpenID Connect configuration
4. User authenticates via Supabase (your Atomic CRM auth UI)
5. Client receives JWT access token
6. Client makes authenticated MCP requests with Bearer token
7. Server validates JWT against Supabase JWKS
8. Server executes queries using user's JWT for RLS enforcement

## Troubleshooting

### Connection to the MCP Server Fails

- Ensure Supabase uses JWT Signing Keys (RS256) instead of JWT Signing Keys (HS256)
  (go to Supabase dashboard > Settings > JWT Keys)
  The current key should NOT use the "Legagy HS256 (Shared Secret)" type, but something like "ECC (P256)".

### JWT Validation Fails

- Verify Supabase is configured for asymmetric JWT signing (RS256)
- Check that `SUPABASE_URL` matches the token's `iss` claim
- Ensure OAuth 2.1 is enabled in Supabase dashboard

### Database Connection Failed

- **"Tenant or user not found"**: Your connection string format is incorrect. For direct connection, use:
  - `postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres`
  - NOT the pooler format with `postgres.PROJECT-REF` or port 6543
- Verify `DATABASE_URL` is correct and accessible
- Ensure you've replaced `[YOUR-PASSWORD]` with your actual database password
- Check firewall rules allow connections from your server

### RLS Blocking Queries

- Check RLS policies allow access for the authenticated user
- Verify `auth.uid()` matches expected user ID
- Test with service role key to bypass RLS (dev only)

## Contributing

```bash
## run in development mode
npm run dev
## build for production
npm run build
npm start
## typecheck
npm run typecheck
```

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP Authorization](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [Supabase OAuth Server](https://supabase.com/docs/guides/auth/oauth-server)
- [RFC 9728 - OAuth Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)

## License

ISC
