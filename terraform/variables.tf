variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
  default     = "dev"
}

variable "name_suffix" {
  description = "Optional suffix to make resource names unique (e.g., for multiple deployments)"
  type        = string
  default     = ""
}

variable "location" {
  description = "Hetzner Cloud location"
  type        = string
  default     = "nbg1"
}

variable "network_zone" {
  description = "Network zone for subnet"
  type        = string
  default     = "eu-central"
}

variable "server_type" {
  description = "Server type (ccx13, cx32, etc.)"
  type        = string
  default     = "ccx13"
}

variable "server_image" {
  description = "Server image"
  type        = string
  default     = "ubuntu-22.04"
}

variable "ssh_key_name" {
  description = "Name of existing SSH key in Hetzner Cloud"
  type        = string
}

variable "load_balancer_type" {
  description = "Load balancer type"
  type        = string
  default     = "lb11"
}

variable "certificate_name" {
  description = "Name of SSL certificate in Hetzner Cloud (optional, leave empty to disable HTTPS)"
  type        = string
  default     = ""
}

variable "docker_image" {
  description = "Docker image to deploy"
  type        = string
  default     = "ghcr.io/habaone/atomic-crm-mcp:latest"
}
