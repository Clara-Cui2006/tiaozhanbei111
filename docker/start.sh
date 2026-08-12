#!/bin/sh
set -eu

mkdir -p /data /run/nginx /var/log/nginx

uvicorn server.main:app --host 127.0.0.1 --port 8090 --proxy-headers --forwarded-allow-ips=127.0.0.1 &
API_PID="$!"

sleep 2
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "Backend failed to start."
  wait "$API_PID"
fi

nginx -g 'daemon off;' &
NGINX_PID="$!"

trap 'kill "$API_PID" "$NGINX_PID" 2>/dev/null || true; wait "$API_PID" "$NGINX_PID" 2>/dev/null || true' INT TERM
wait "$NGINX_PID"
