#!/bin/sh
set -e

echo "=============================================="
echo "Starting Application & Database Initialization"
echo "=============================================="

# Wait for PostgreSQL database port 5432 to accept TCP connections
echo "Waiting for PostgreSQL database at db:5432..."
until node -e "
const net = require('net');
const socket = net.createConnection(5432, 'db', () => {
  socket.end();
  process.exit(0);
});
socket.on('error', () => {
  process.exit(1);
});
" 2>/dev/null; do
  echo "Database is not ready yet. Retrying in 2 seconds..."
  sleep 2
done

echo "Database is ready! Pushing Prisma database schema..."
prisma db push --accept-data-loss --skip-generate || true

echo "Seeding initial database data..."
node prisma/seed.js || true

echo "Starting background cron service..."
node cron.js &

echo "Starting Next.js production web server..."
exec node server.js
