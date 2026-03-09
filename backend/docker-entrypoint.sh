#!/bin/sh
set -e

echo "🚀 Starting Yogev Backend..."
echo "⏳ Waiting for database..."

until pg_isready -h postgres -p 5432 -U yogev -d yogev_db
do
  echo "⏳ Database not ready yet..."
  sleep 2
done

echo "✅ Database is ready!"

echo "🔄 Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations completed successfully"

if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  if npx prisma db seed; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️ Seed failed (this may be okay if data already exists)"
  fi
fi

echo "🚀 Starting application..."
exec node dist/main.js