output "server_public_ip" {
  description = "Public IP address of the MCP server"
  value       = hcloud_server.mcp_server.ipv4_address
}

output "server_private_ip" {
  description = "Private IP address of the MCP server"
  value       = hcloud_server.mcp_server.network[*].ip
}

output "load_balancer_ip" {
  description = "Public IP address of the load balancer"
  value       = hcloud_load_balancer.mcp_lb.ipv4
}

output "server_id" {
  description = "ID of the MCP server"
  value       = hcloud_server.mcp_server.id
}

output "load_balancer_id" {
  description = "ID of the load balancer"
  value       = hcloud_load_balancer.mcp_lb.id
}
