import pg from "pg";
import { z } from "zod";
import { decodeJwt } from "jose";
import { config } from "../../config.js";
import type { AuthInfo } from "../../auth/jwt-validator.js";
import type { McpContext } from "../server.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function executeQuery(
  sql: string,
  authInfo: AuthInfo,
  userToken: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  let client;

  try {
    client = await pool.connect();
    const jwtClaims = decodeJwt(userToken);

    await client.query("BEGIN");

    await client.query(`SET LOCAL role = 'authenticated'`);

    // SET commands don't support parameterized queries, so we need to escape and embed the JSON
    const claimsJson = JSON.stringify(jwtClaims).replace(/'/g, "''");
    await client.query(`SET LOCAL request.jwt.claims = '${claimsJson}'`);

    const result = await client.query(sql);

    await client.query("COMMIT");

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    console.error("Query execution error:", error);

    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    // Handle AggregateError which has multiple errors
    let errorMessage: string;
    if (error instanceof AggregateError && error.errors.length > 0) {
      errorMessage = error.errors
        .map((e) => (e instanceof Error ? e.message : String(e)))
        .join("; ");
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    return {
      success: false,
      error: errorMessage || "Unknown database error",
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export const query = {
  definition: {
    description: `Query data from the user's Atomic CRM instance using SQL.

IMPORTANT: Before using this tool, you MUST call the get_schema tool first to understand what tables and columns are available in the database.

Use this tool when the user asks about their CRM data such as:
- Contacts, companies, and deals
- Sales pipeline and forecasting data
- Customer interactions and notes
- Tasks and follow-ups
- Custom fields and metadata

Row Level Security (RLS) is enforced - queries automatically return only data the authenticated user has permission to access.

Note: Use the *_summary views (contacts_summary, companies_summary) for queries that need aggregated data or search capabilities.

Examples:
- "SELECT id, first_name, last_name, email_fts FROM contacts_summary WHERE email_fts LIKE '%@company.com%'"
- "SELECT name, stage, amount FROM deals WHERE created_at > NOW() - INTERVAL '30 days' ORDER BY amount DESC"
- "SELECT COUNT(*) as total_tasks, type FROM tasks WHERE done_date IS NULL GROUP BY type"
- "SELECT c.first_name, c.last_name, co.name as company_name FROM contacts c JOIN companies co ON c.company_id = co.id WHERE co.sector = 'Technology'"`,
    inputSchema: z.object({
      sql: z
        .string()
        .describe(
          "PostgreSQL query to execute against the Atomic CRM database. Supports standard SQL including SELECT, JOINs, aggregations, and PostgreSQL functions. RLS policies are automatically enforced."
        ),
    }),
  },
  handler: async (params: { sql: string }, context: McpContext) => {
    try {
      const result = await executeQuery(
        params.sql,
        context.authInfo,
        context.userToken
      );

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
      };
    } catch (error) {
      console.error("Tool handler error:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  },
};
