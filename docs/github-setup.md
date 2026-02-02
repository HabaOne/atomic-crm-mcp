# GitHub Environment Setup for atomic-crm-mcp

This document describes the GitHub environments, secrets, and variables required for CI/CD deployment.

## Environments

Create two environments in GitHub repository settings (Settings > Environments):

1. **stage** - Staging environment
2. **prod** - Production environment (recommended: add protection rules requiring approval)

## Required Secrets

Add these secrets to both `stage` and `prod` environments:

| Secret | Description | Notes |
|--------|-------------|-------|
| `HCLOUD_TOKEN` | Hetzner Cloud API token | Same as haba-ai |
| `HETZNER_OBJECT_STORAGE_ACCESS_KEY` | S3 access key for Terraform state | Same as haba-ai |
| `HETZNER_OBJECT_STORAGE_SECRET_KEY` | S3 secret key for Terraform state | Same as haba-ai |
| `SSH_PRIVATE_KEY` | SSH key for server deployment | Same as haba-ai |
| `SUPABASE_URL` | Supabase project URL | From atomic-crm Supabase project |
| `DATABASE_URL` | PostgreSQL connection string | From atomic-crm Supabase project |

## Required Variables

Add these variables to both `stage` and `prod` environments:

| Variable | Stage Value | Prod Value |
|----------|-------------|------------|
| `HCLOUD_SSH_KEY_NAME` | (same as haba-ai) | (same as haba-ai) |
| `HETZNER_OBJECT_STORAGE_BUCKET` | (same as haba-ai) | (same as haba-ai) |
| `HETZNER_OBJECT_STORAGE_ENDPOINT` | (same as haba-ai) | (same as haba-ai) |
| `MCP_SERVER_URL` | `https://crm-mcp-stage.haba.services` | `https://crm-mcp.haba.services` |

## DNS Configuration

After deployment, create DNS records pointing to the Hetzner Load Balancer IP:

- **Stage**: `crm-mcp-stage.haba.services` -> Load Balancer IP
- **Prod**: `crm-mcp.haba.services` -> Load Balancer IP

## SSL Certificates

Create managed SSL certificates in Hetzner Cloud Console:
1. Go to Hetzner Cloud Console > Security > Certificates
2. Create a new certificate for each domain
3. Update `terraform.tfvars` with the certificate name:
   ```hcl
   certificate_name = "crm-mcp-stage-cert"  # for staging
   ```

## Quick Setup Checklist

### Stage Environment
- [ ] Create `stage` environment in GitHub
- [ ] Add all secrets listed above
- [ ] Add all variables with stage values
- [ ] Create DNS record for `crm-mcp-stage.haba.services`
- [ ] Create SSL certificate in Hetzner

### Prod Environment
- [ ] Create `prod` environment in GitHub
- [ ] Configure protection rules (require approval)
- [ ] Add all secrets listed above
- [ ] Add all variables with prod values
- [ ] Create DNS record for `crm-mcp.haba.services`
- [ ] Create SSL certificate in Hetzner

## Terraform State

The Terraform state is stored in Hetzner Object Storage (S3-compatible):
- **Bucket**: Same as haba-ai
- **State files**:
  - Stage: `atomic-crm-mcp/stage/terraform.tfstate`
  - Prod: `atomic-crm-mcp/prod/terraform.tfstate`
