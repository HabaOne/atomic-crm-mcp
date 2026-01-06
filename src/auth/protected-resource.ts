import { config } from '../config.js';

export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  resource_documentation?: string;
}

export function buildProtectedResourceMetadata(): ProtectedResourceMetadata {
  return {
    resource: config.mcpServerUrl,
    authorization_servers: [config.supabase.authUrl],
    bearer_methods_supported: ['header'],
  };
}
