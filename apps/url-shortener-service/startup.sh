#!/bin/sh

echo "🚀 Starting URL Shortener Service..."

# Aguardar o banco estar disponível
echo "⏳ Waiting for database to be ready..."
until npx prisma db push --accept-data-loss; do
  echo "💤 Database not ready yet, waiting 2 seconds..."
  sleep 2
done

echo "✅ Database schema synchronized successfully!"

# Gerar cliente Prisma (caso necessário)
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🎯 Starting application..."
# Iniciar o serviço
exec node dist/apps/url-shortener-service/main.js 