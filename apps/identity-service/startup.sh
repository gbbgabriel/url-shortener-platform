#!/bin/sh

# =======================================================
# Identity Service Startup Script
# =======================================================

echo "🔐 Starting Identity Service..."
echo "📊 Environment: $NODE_ENV"
echo "🗄️ Database URL: ${DATABASE_URL%@*}@***"

# Wait for database to be ready
echo "⏳ Waiting for database..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "🔄 Database not ready, retrying in 3 seconds..."
  sleep 3
done

echo "✅ Database synchronized successfully"

# Start the application
echo "🚀 Starting Identity Service application..."
exec node dist/apps/identity-service/main.js 