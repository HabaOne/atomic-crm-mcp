import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { config } from '../config.js';

const JWKS = createRemoteJWKSet(new URL(config.supabase.jwksUrl));

export interface AuthInfo {
  userId: string;
  role?: string;
  clientId?: string;
}

export async function validateJWT(token: string): Promise<AuthInfo> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.supabase.authUrl,
    });

    if (!payload.sub) {
      throw new Error('Token missing sub claim');
    }

    return {
      userId: payload.sub,
      role: payload.role as string | undefined,
      clientId: payload.client_id as string | undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT validation failed: ${error.message}`);
    }
    throw new Error('JWT validation failed');
  }
}
