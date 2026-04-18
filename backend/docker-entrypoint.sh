#!/bin/sh
set -e

echo "🚀 Starting Yogev Backend..."
echo "⏳ Waiting for database..."

# Wait for database to be ready
MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h postgres -p 5432 -U yogev -d yogev_db
do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database connection failed after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "⏳ Database not ready yet... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ Database is ready!"

# Sync database schema
echo "🔄 Syncing database schema..."
if npx prisma db push --accept-data-loss; then
  echo "✅ Schema sync completed successfully"
else
  echo "⚠️ Schema sync had issues, attempting to continue..."
fi

# Generate Prisma client (ensures it matches the schema)
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run battalion/company backfill (idempotent — safe to run every startup)
if [ -f prisma/battalion-backfill.js ]; then
  echo "🏛️ Running battalion backfill..."
  if node prisma/battalion-backfill.js; then
    echo "✅ Battalion backfill completed"
  else
    echo "⚠️ Battalion backfill had issues (continuing anyway)"
  fi
fi

# Seed database if requested
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  if npx prisma db seed; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️ Seed failed (this may be okay if data already exists)"
  fi
fi

echo "🚀 Starting application..."
exec node dist/src/main.js