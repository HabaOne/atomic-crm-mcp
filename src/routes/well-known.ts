import { Router } from 'express';
import { buildProtectedResourceMetadata } from '../auth/protected-resource.js';
import { config } from '../config.js';

const router = Router();

router.get('/oauth-protected-resource', (req, res) => {
  res.json(buildProtectedResourceMetadata());
});

// Redirect to Supabase's authorization server metadata
// This is a workaround for clients that don't properly read the authorization_servers field
router.get('/oauth-authorization-server', (req, res) => {
  res.redirect(301, `${config.supabase.authUrl}/.well-known/oauth-authorization-server`);
});

export default router;
