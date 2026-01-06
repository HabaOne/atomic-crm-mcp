import 'dotenv/config';

export interface Config {
  port: number;
  mcpServerUrl: string;
  databaseUrl: string;
  supabase: {
    url: string;
    authUrl: string;
    jwksUrl: string;
    discoveryUrl: string;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getCliArg(prefix: string): string | undefined {
  const arg = process.argv.find(arg => arg.startsWith(prefix));
  return arg?.substring(prefix.length);
}

const supabaseUrl = getRequiredEnv('SUPABASE_URL');
const databaseUrl = getRequiredEnv('DATABASE_URL');

const cliUrl = getCliArg('--url=');

export const config: Config = {
  port: parseInt(getEnv('PORT', '3000'), 10),
  mcpServerUrl: cliUrl || getEnv('MCP_SERVER_URL', 'http://localhost:3000'),
  databaseUrl,
  supabase: {
    url: supabaseUrl,
    authUrl: `${supabaseUrl}/auth/v1`,
    jwksUrl: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    discoveryUrl: `${supabaseUrl}/auth/v1/.well-known/openid-configuration`,
  },
};
