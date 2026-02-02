#!/bin/bash
# User data script for Hetzner Cloud server
# Installs Docker and Docker Compose for atomic-crm-mcp

set -e

# Update system
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group (if not root)
if [ "$USER" != "root" ]; then
    usermod -aG docker $USER
fi

# Create app directory
mkdir -p /opt/atomic-crm-mcp
cd /opt/atomic-crm-mcp

# Create docker-compose.yml file
cat > docker-compose.yml << 'EOF'
services:
  mcp:
    image: ${DOCKER_IMAGE}
    container_name: atomic-crm-mcp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - MCP_SERVER_URL=$${MCP_SERVER_URL}
      - SUPABASE_URL=$${SUPABASE_URL}
      - DATABASE_URL=$${DATABASE_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/.well-known/oauth-protected-resource"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Create .env file placeholder (will be replaced by deployment script)
cat > .env << EOF
DOCKER_IMAGE=${DOCKER_IMAGE}
ENVIRONMENT=${ENVIRONMENT}
MCP_SERVER_URL=placeholder
SUPABASE_URL=placeholder
DATABASE_URL=placeholder
EOF

# Enable Docker service
systemctl enable docker
systemctl start docker

echo "Server setup completed. Docker and Docker Compose installed."
echo "Note: Update .env file with actual values before running docker compose up"
