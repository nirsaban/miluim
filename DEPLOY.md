# Yogev System - Production Deployment Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Ports 80 (and 443 for SSL) available

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd yogev-system

# Copy environment file
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` and set the following required values:

```bash
# Required: Set a secure PostgreSQL password
POSTGRES_PASSWORD=your_secure_password_here

# Required: Set a strong JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here

# Optional: Gmail API credentials for email functionality
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER_EMAIL=...

# First deployment only: Set to true to seed initial data
SEED_DATABASE=true
```

### 3. Deploy

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### 4. Access the Application

- Frontend: http://localhost
- Backend API: http://localhost/api
- Health Check: http://localhost/api/health

## Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Port 80)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐           ┌──────▼──────┐
       │  Frontend   │           │  Backend    │
       │ (Next.js)   │           │ (NestJS)    │
       │  Port 3000  │           │  Port 3001  │
       └─────────────┘           └──────┬──────┘
                                        │
                                 ┌──────▼──────┐
                                 │ PostgreSQL  │
                                 │  Port 5432  │
                                 └─────────────┘
```

## Services

| Service   | Container Name   | Internal Port | Description          |
|-----------|------------------|---------------|----------------------|
| postgres  | yogev-postgres   | 5432          | PostgreSQL database  |
| backend   | yogev-backend    | 3001          | NestJS API server    |
| frontend  | yogev-frontend   | 3000          | Next.js web app      |
| nginx     | yogev-nginx      | 80, 443       | Reverse proxy        |

## Common Operations

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop Services

```bash
# Stop all (keeps data)
docker compose down

# Stop and remove volumes (WARNING: deletes database!)
docker compose down -v
```

### Update and Redeploy

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker compose exec postgres psql -U yogev -d yogev_db

# Run migrations manually
docker compose exec backend npx prisma migrate deploy

# Seed database manually
docker compose exec backend npx prisma db seed
```

### Access Container Shell

```bash
# Backend container
docker compose exec backend sh

# Frontend container
docker compose exec frontend sh
```

## Health Checks

All services include health checks:

- **Nginx**: `http://localhost/health`
- **Backend**: `http://localhost/api/health`
- **Frontend**: `http://localhost:3000`
- **PostgreSQL**: `pg_isready` command

Check health status:
```bash
docker compose ps
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

1. Point your domain to the server IP

2. Create SSL directory:
```bash
mkdir -p nginx/ssl
```

3. Obtain certificates using certbot:
```bash
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d your-domain.com
```

4. Edit `nginx/nginx.conf`:
   - Uncomment the HTTPS redirect in the HTTP server block
   - Uncomment the HTTPS server block
   - Update `server_name` to your domain

5. Restart nginx:
```bash
docker compose restart nginx
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs for errors
docker compose logs

# Check if ports are in use
lsof -i :80
lsof -i :3001
```

### Database Connection Issues

```bash
# Verify postgres is running
docker compose ps postgres

# Test database connection
docker compose exec postgres pg_isready -U yogev -d yogev_db
```

### Frontend Not Loading

```bash
# Check frontend build logs
docker compose logs frontend

# Rebuild frontend
docker compose up -d --build frontend
```

### Migration Failures

```bash
# View migration status
docker compose exec backend npx prisma migrate status

# Reset database (WARNING: deletes all data!)
docker compose exec backend npx prisma migrate reset
```

## Data Persistence

Data is stored in Docker volumes:

- `postgres_data` - PostgreSQL database files
- `uploads_data` - Uploaded files (shifts, social media)

To backup:
```bash
# Backup database
docker compose exec postgres pg_dump -U yogev yogev_db > backup.sql

# Backup uploads
docker cp yogev-backend:/app/uploads ./uploads-backup
```

To restore:
```bash
# Restore database
docker compose exec -T postgres psql -U yogev yogev_db < backup.sql
```

## Default Credentials

After initial deployment with `SEED_DATABASE=true`:

| Role            | Personal ID | Password    |
|-----------------|-------------|-------------|
| SERGEANT_MAJOR  | 1000000     | Yogev2024!  |
| DUTY_OFFICER    | 1000001     | Yogev2024!  |
| SQUAD_COMMANDER | 1000002     | Yogev2024!  |

**Important:** Change these passwords immediately after first login!

## Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Set strong `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Configure Gmail API credentials
- [ ] Set `SEED_DATABASE=false` after initial deployment
- [ ] Setup SSL/HTTPS
- [ ] Change default user passwords
- [ ] Configure firewall (allow only 80/443)
- [ ] Setup automated backups
- [ ] Configure log rotation
