#!/bin/sh
set -e

mkdir -p /app/data
echo "========================================================="
echo "🚀 STARTING HUMANIUS 24/7 SHIFT SMS BACKEND WORKER"
echo "========================================================="

# Start backend worker in background
node /app/server-worker.cjs &
WORKER_PID=$!
echo "Backend Shift SMS Worker started with PID: $WORKER_PID"

# Start Nginx in foreground
echo "Starting Nginx HTTP server on port 8080..."
exec nginx -g "daemon off;"
