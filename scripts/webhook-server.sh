#!/bin/bash
# ================================================
# Simple Webhook Server for Auto-Deployment
# ================================================
# This script creates a simple webhook endpoint that
# triggers deployment when called.
#
# Usage:
#   ./scripts/webhook-server.sh
#
# Then configure GitHub webhook to POST to:
#   http://your-server:9000/deploy?token=YOUR_SECRET_TOKEN
#
# Requires: netcat (nc) or socat
# ================================================

WEBHOOK_PORT="${WEBHOOK_PORT:-9000}"
WEBHOOK_TOKEN="${WEBHOOK_TOKEN:-your-secret-token}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Starting webhook server on port $WEBHOOK_PORT..."
echo "Webhook URL: http://your-server:$WEBHOOK_PORT/deploy?token=$WEBHOOK_TOKEN"

while true; do
    # Listen for incoming connections
    REQUEST=$(nc -l -p $WEBHOOK_PORT -q 1)

    # Check if it's a valid deploy request
    if echo "$REQUEST" | grep -q "GET /deploy?token=$WEBHOOK_TOKEN"; then
        echo "$(date): Valid deploy request received"

        # Send response
        echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nDeployment started" | nc -l -p $WEBHOOK_PORT -q 1 &

        # Run deployment
        cd "$PROJECT_DIR"
        ./scripts/deploy.sh --build >> /var/log/yogev-deploy.log 2>&1

        echo "$(date): Deployment completed"
    elif echo "$REQUEST" | grep -q "GET /health"; then
        echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nOK"
    else
        echo -e "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nForbidden"
    fi
done
