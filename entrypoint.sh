#!/bin/sh
set -e

mkdir -p /app/data
echo "========================================================="
echo "🚀 STARTING HUMANIUS 24/7 SHIFT SMS BACKEND WORKER"
echo "========================================================="

# Start backend worker in background under a supervisor loop
(
  while true; do
    echo "[Supervisor] Starting Humanius 24/7 Shift SMS Worker..."
    node /app/server-worker.cjs || true
    echo "[Supervisor] Worker exited. Restarting in 3 seconds..."
    sleep 3
  done
) &
WORKER_PID=$!
echo "Backend Shift SMS Worker supervisor started with PID: $WORKER_PID"

# Start Nginx in foreground
echo "Starting Nginx HTTP server on port 8080..."
exec nginx -g "daemon off;"
