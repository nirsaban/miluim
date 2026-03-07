#!/bin/bash

set -e

echo "🚀 Starting Yogev System Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Pull latest code (if using git)
# git pull origin main

# Build and start containers
echo "📦 Building Docker containers..."
docker-compose build --no-cache

echo "🗄️ Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy

# Seed database (optional - comment out after first deployment)
echo "🌱 Seeding database..."
docker-compose exec -T backend npx prisma db seed

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Services status:"
docker-compose ps

echo ""
echo "🌐 Application is available at:"
echo "   Frontend: http://localhost"
echo "   API: http://localhost/api"
