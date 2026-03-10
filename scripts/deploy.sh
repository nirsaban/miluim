#!/bin/bash
# ================================================
# Yogev System - Production Deployment Script
# ================================================
# Usage: ./scripts/deploy.sh [options]
# Options:
#   --build    Force rebuild of Docker images
#   --seed     Seed the database after deployment
#   --logs     Show logs after deployment
#   --no-pull  Skip git pull
# ================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BUILD_FLAG="--build"
SEED_FLAG=""
SHOW_LOGS=""
SKIP_PULL=""

for arg in "$@"; do
    case $arg in
        --build)
            BUILD_FLAG="--build"
            ;;
        --seed)
            SEED_FLAG="true"
            ;;
        --logs)
            SHOW_LOGS="true"
            ;;
        --no-pull)
            SKIP_PULL="true"
            ;;
    esac
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Yogev System - Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Step 1: Pull latest code
if [ "$SKIP_PULL" != "true" ]; then
    echo -e "\n${YELLOW}[1/6] Pulling latest code from git...${NC}"
    git fetch origin

    # Check if there are changes
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}New changes detected, updating...${NC}"
        git reset --hard origin/main
        echo -e "${GREEN}✓ Code updated to $(git rev-parse --short HEAD)${NC}"
    else
        echo -e "${GREEN}✓ Already up to date${NC}"
    fi
else
    echo -e "\n${YELLOW}[1/6] Skipping git pull (--no-pull)${NC}"
fi

# Step 2: Check environment file
echo -e "\n${YELLOW}[2/6] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${BLUE}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}⚠ Please edit .env with your production values!${NC}"
    else
        echo -e "${RED}ERROR: .env file not found!${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Environment file exists${NC}"

# Step 3: Set environment variables
echo -e "\n${YELLOW}[3/6] Setting environment variables...${NC}"
if [ "$SEED_FLAG" = "true" ]; then
    export SEED_DATABASE=true
    echo -e "${BLUE}Database seeding: ENABLED${NC}"
else
    export SEED_DATABASE=false
    echo -e "${GREEN}Database seeding: disabled${NC}"
fi

# Step 4: Stop existing containers gracefully
echo -e "\n${YELLOW}[4/6] Preparing containers...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Old containers stopped${NC}"

# Step 5: Deploy with Docker Compose
echo -e "\n${YELLOW}[5/6] Building and starting containers...${NC}"
docker compose up -d $BUILD_FLAG

# Step 6: Wait for services to be healthy
echo -e "\n${YELLOW}[6/6] Waiting for services to be healthy...${NC}"
MAX_WAIT=180
WAITED=0
ALL_HEALTHY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    POSTGRES_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' yogev-postgres 2>/dev/null || echo "not_running")
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' yogev-backend 2>/dev/null || echo "not_running")
    FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' yogev-frontend 2>/dev/null || echo "not_running")

    echo -ne "\r  Postgres: ${POSTGRES_HEALTH} | Backend: ${BACKEND_HEALTH} | Frontend: ${FRONTEND_HEALTH}    "

    if [ "$POSTGRES_HEALTH" = "healthy" ] && [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ]; then
        ALL_HEALTHY=true
        break
    fi

    sleep 5
    WAITED=$((WAITED + 5))
done

echo ""

if [ "$ALL_HEALTHY" = "true" ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
else
    echo -e "${YELLOW}⚠ Some services may still be starting${NC}"
    echo -e "Check status with: docker compose ps"
    echo -e "Check logs with: docker compose logs -f"
fi

# Show status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
docker compose ps
echo ""
echo -e "${BLUE}Application URLs:${NC}"
echo -e "  Frontend: http://localhost"
echo -e "  API:      http://localhost/api"
echo -e "  Health:   http://localhost/api/health"

# Show logs if requested
if [ "$SHOW_LOGS" = "true" ]; then
    echo -e "\n${YELLOW}Showing logs (Ctrl+C to exit):${NC}"
    docker compose logs -f
fi
