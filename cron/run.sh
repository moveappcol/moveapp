#!/bin/sh
# Corre una sola vez y sale — así lo espera Railway de un servicio cron.
# CRON_PATH y CRON_SECRET los define cada servicio de Railway por separado
# (mismo Dockerfile, distinto endpoint).
set -u

if [ -z "${CRON_PATH:-}" ]; then
  echo "Falta CRON_PATH" >&2
  exit 1
fi

# -S: si falla, deja en el log el motivo (DNS, conexión, HTTP 5xx...) —
# antes con -s solo quedaba "Starting Container" y no se sabía por qué.
# --retry-all-errors: Railway a veces no logra salir a la red desde el
# contenedor del cron (la petición ni llega a move-web); con 2 reintentos de
# 10s no alcanzaba. 5 reintentos de 15s caben de sobra antes de la próxima
# corrida (cada 5 min).
curl -sSf --max-time 60 --retry 5 --retry-delay 15 --retry-max-time 240 --retry-all-errors \
  -w "\nHTTP %{http_code} en %{time_total}s\n" \
  -X GET "https://www.uniqueappcol.com${CRON_PATH}" \
  -H "Authorization: Bearer ${CRON_SECRET}"
