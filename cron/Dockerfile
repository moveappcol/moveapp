# Imagen mínima para los cron jobs de Railway que reemplazan a los workflows
# de GitHub Actions de alta frecuencia (*/5 * * * *) — GitHub no garantiza esa
# cadencia en repos de bajo tráfico (se vieron huecos reales de hasta 5 horas),
# lo que hacía perder los correos de recordatorio de clase y de reservas
# finales. Railway sí ejecuta el cron en el minuto exacto. Un solo Dockerfile
# sirve para los tres crons — cada servicio de Railway le pasa su propia
# CRON_PATH (ver run.sh).
FROM alpine:3.20
RUN apk add --no-cache curl
COPY run.sh /run.sh
RUN chmod +x /run.sh
ENTRYPOINT ["/run.sh"]
