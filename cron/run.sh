#!/bin/sh
# Corre una sola vez y sale — así lo espera Railway de un servicio cron.
# CRON_PATH y CRON_SECRET los define cada servicio de Railway por separado
# (mismo Dockerfile, distinto endpoint).
set -u

if [ -z "${CRON_PATH:-}" ]; then
  echo "Falta CRON_PATH" >&2
  exit 1
fi

curl -sf --max-time 60 --retry 2 --retry-delay 10 --retry-max-time 180 \
  -X GET "https://www.uniqueappcol.com${CRON_PATH}" \
  -H "Authorization: Bearer ${CRON_SECRET}"
