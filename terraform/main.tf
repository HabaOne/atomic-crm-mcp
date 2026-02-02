terraform {
  required_version = "= 1.6.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.46"
    }
  }

  backend "s3" {
    # Backend configuration: bucket, key, region provided via backend config file (backend.tfvars)
    # Using Hetzner Object Storage (S3-compatible)
    # Credentials must be provided via environment variables:
    # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    # Note: The endpoints block must be set here in main.tf (cannot be in backend config file)
    # For CI/CD: GitHub Actions replaces PLACEHOLDER_ENDPOINT_URL with actual endpoint
    # For local dev: Manually replace PLACEHOLDER_ENDPOINT_URL in this file
    endpoints = {
      s3 = "PLACEHOLDER_ENDPOINT_URL"
    }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    use_path_style              = true
    skip_s3_checksum            = true
    skip_requesting_account_id  = true
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# Network
resource "hcloud_network" "mcp_network" {
  name     = "${var.environment}-crm-mcp-network${var.name_suffix != "" ? "-${var.name_suffix}" : ""}"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "mcp_subnet" {
  network_id   = hcloud_network.mcp_network.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = "10.0.1.0/24"
}

# Firewall - Only allow SSH from external
resource "hcloud_firewall" "mcp_firewall" {
  name = "${var.environment}-crm-mcp-firewall${var.name_suffix != "" ? "-${var.name_suffix}" : ""}"

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["0.0.0.0/0"]
    description = "Allow SSH from anywhere"
  }
}

# SSH Key
data "hcloud_ssh_key" "main" {
  name = var.ssh_key_name
}

# SSL Certificate (if certificate_name is provided)
data "hcloud_certificate" "mcp_cert" {
  count = var.certificate_name != "" ? 1 : 0
  name  = var.certificate_name
}

# Server
resource "hcloud_server" "mcp_server" {
  name        = "${var.environment}-crm-mcp-server${var.name_suffix != "" ? "-${var.name_suffix}" : ""}"
  image       = var.server_image
  server_type = var.server_type
  location    = var.location
  ssh_keys    = [data.hcloud_ssh_key.main.id]

  network {
    network_id = hcloud_network.mcp_network.id
    ip         = "10.0.1.2"
  }

  firewall_ids = [hcloud_firewall.mcp_firewall.id]

  labels = {
    environment = var.environment
    managed-by  = "terraform"
    service     = "crm-mcp"
  }

  user_data = templatefile("${path.module}/scripts/user_data.sh", {
    DOCKER_IMAGE = var.docker_image
    ENVIRONMENT  = var.environment
  })
}

# Load Balancer
resource "hcloud_load_balancer" "mcp_lb" {
  name               = "${var.environment}-crm-mcp-lb${var.name_suffix != "" ? "-${var.name_suffix}" : ""}"
  load_balancer_type = var.load_balancer_type
  location           = var.location

  labels = {
    environment = var.environment
    managed-by  = "terraform"
    service     = "crm-mcp"
  }
}

# Attach load balancer to network
resource "hcloud_load_balancer_network" "mcp_lb_network" {
  load_balancer_id = hcloud_load_balancer.mcp_lb.id
  network_id       = hcloud_network.mcp_network.id
}

# HTTPS Service (forward to port 3000) - only created if certificate name is provided
resource "hcloud_load_balancer_service" "https" {
  count            = var.certificate_name != "" ? 1 : 0
  load_balancer_id = hcloud_load_balancer.mcp_lb.id
  protocol         = "https"
  listen_port      = 443
  destination_port = 3000

  http {
    sticky_sessions = false
    certificates    = [data.hcloud_certificate.mcp_cert[0].id]
    redirect_http   = true
  }

  health_check {
    protocol = "http"
    port     = 3000
    interval = 15
    timeout  = 10
    retries  = 3
    http {
      path         = "/.well-known/oauth-protected-resource"
      status_codes = ["2??", "3??"]
    }
  }
}

# HTTP Service (for health checks when no certificate)
resource "hcloud_load_balancer_service" "http" {
  count            = var.certificate_name == "" ? 1 : 0
  load_balancer_id = hcloud_load_balancer.mcp_lb.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 3000

  health_check {
    protocol = "http"
    port     = 3000
    interval = 15
    timeout  = 10
    retries  = 3
    http {
      path         = "/.well-known/oauth-protected-resource"
      status_codes = ["2??", "3??"]
    }
  }
}

# Load Balancer Target
resource "hcloud_load_balancer_target" "mcp_server" {
  type             = "server"
  load_balancer_id = hcloud_load_balancer.mcp_lb.id
  server_id        = hcloud_server.mcp_server.id
  use_private_ip   = true
}
