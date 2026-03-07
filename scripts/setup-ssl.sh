#!/bin/bash
set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh your-domain.com"
    exit 1
fi

echo "=== Setting up SSL for $DOMAIN ==="

# Install certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Stop nginx temporarily
docker compose stop nginx

# Get certificate
certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Copy certificates to nginx directory
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

# Update nginx config for SSL (uncomment HTTPS block)
echo "Certificates obtained successfully!"
echo ""
echo "To enable HTTPS:"
echo "1. Edit nginx/nginx.conf"
echo "2. Uncomment the HTTPS server block"
echo "3. Replace 'your-domain.com' with '$DOMAIN'"
echo "4. Restart nginx: docker compose restart nginx"
echo ""
echo "Setting up auto-renewal..."
echo "0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem /path/to/yogev-system/nginx/ssl/ && docker compose restart nginx" | crontab -

# Restart nginx
docker compose start nginx

echo "SSL setup complete!"
