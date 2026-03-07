#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.sql.gz>"
    echo "Example: ./restore.sh ./backups/yogev_db_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  Warning: This will overwrite the current database!"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "🗄️ Restoring database from backup..."

# Decompress and restore
gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U yogev yogev_db

echo "✅ Database restored successfully!"
