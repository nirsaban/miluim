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

# Run Prisma migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️ Prisma migrate deploy had issues, attempting to continue..."
fi

# Generate Prisma client (ensures it matches the schema)
echo "🔧 Generating Prisma client..."
npx prisma generate

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