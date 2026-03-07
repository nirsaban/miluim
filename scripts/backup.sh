#!/bin/bash

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/yogev_db_$TIMESTAMP.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

echo "🗄️ Creating database backup..."

# Backup PostgreSQL database
docker-compose exec -T postgres pg_dump -U yogev yogev_db > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only last 7 backups
echo "🧹 Cleaning old backups..."
ls -t $BACKUP_DIR/*.gz | tail -n +8 | xargs -r rm --

echo "✅ Backup completed!"
