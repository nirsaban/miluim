#!/bin/sh
set -e

echo "🚀 Starting Yogev Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Database not ready, retrying in 2 seconds... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
  exit 1
fi

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi

# Optional: Run seed if SEED_DATABASE is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed
  if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️ Seed failed (this may be okay if data already exists)"
  fi
fi

# Start the application
echo "🚀 Starting application..."
exec node dist/main
