import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const moveWeb = service("move-web", {
    source: github("moveappcol/moveapp", { checkSuites: false }),
    replicas: { "sfo": 1 },
    domains: ["www.uniqueappcol.com"],
    env: { AIRTABLE_API_KEY: preserve(), AIRTABLE_BASE_ID: preserve(), CLERK_SECRET_KEY: preserve(), CRON_SECRET: preserve(), META_CONVERSIONS_API_TOKEN: preserve(), NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: preserve(), NEXT_PUBLIC_SITE_URL: preserve(), NEXT_PUBLIC_WOMPI_PUBLIC_KEY: preserve(), RESEND_API_KEY: preserve(), RESEND_FROM_EMAIL: preserve(), WOMPI_EVENTS_SECRET: preserve(), WOMPI_INTEGRITY_SECRET: preserve(), WOMPI_PRIVATE_KEY: preserve() },
  });

  // Reemplazan los workflows de GitHub Actions "*/5 * * * *" para
  // recordatorio-clase, reservas-finales y despues-clase — GitHub no
  // garantiza esa cadencia en repos de bajo tráfico (huecos reales de hasta
  // 5 horas encontrados en el historial), y estos 3 crons dependen de
  // ventanas de solo ~20 minutos para no perder el correo. El cron nativo de
  // Railway sí corre en el minuto exacto. Mismo Dockerfile para los tres,
  // cada uno le pasa su propio CRON_PATH (ver cron/run.sh).
  const cronSource = github("moveappcol/moveapp", { rootDirectory: "cron" });
  const cronBuild = { builder: "DOCKERFILE" as const, dockerfilePath: "Dockerfile" };
  const cronSchedule = { cronSchedule: "*/5 * * * *", restartPolicyType: "NEVER" as const };

  const cronRecordatorioClase = service("cron-recordatorio-clase", {
    source: cronSource,
    build: cronBuild,
    deploy: cronSchedule,
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/recordatorio-clase" },
  });

  const cronReservasFinales = service("cron-reservas-finales", {
    source: cronSource,
    build: cronBuild,
    deploy: cronSchedule,
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/reservas-finales" },
  });

  const cronDespuesClase = service("cron-despues-clase", {
    source: cronSource,
    build: cronBuild,
    deploy: cronSchedule,
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/despues-clase" },
  });

  // Este se había quedado fuera de la migración original — seguía en GitHub
  // Actions corriendo solo cada 4 horas, así que el correo de 24h antes a
  // veces salía con horas de diferencia (nunca "exactas" 24h antes).
  const cronLiquidaciones = service("cron-liquidaciones", {
    source: cronSource,
    build: cronBuild,
    deploy: cronSchedule,
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/liquidaciones" },
  });

  // Estos 5 se crearon a mano en el dashboard de Railway (no quedaron
  // declarados aquí) — se agregan con el mismo nombre y horario que tienen
  // allá para que el código refleje lo que corre en producción. Sin esto,
  // un `railway config apply` los BORRARÍA (lo que no está declarado en
  // este archivo se elimina), incluido el que cobra la conversión de la
  // Prueba UNIQUE al Starter.
  const cronConvertirPruebas = service("cron-convertir-pruebas", {
    source: cronSource,
    build: cronBuild,
    deploy: { cronSchedule: "0 */4 * * *", restartPolicyType: "NEVER" },
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/convertir-pruebas" },
  });

  const cronVencerPruebas = service("cron-vencer-pruebas", {
    source: cronSource,
    build: cronBuild,
    deploy: { cronSchedule: "0 9 * * *", restartPolicyType: "NEVER" },
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/vencer-pruebas" },
  });

  const cronRecordatorioPrueba = service("cron-recordatorio-prueba", {
    source: cronSource,
    build: cronBuild,
    deploy: { cronSchedule: "0 9 * * *", restartPolicyType: "NEVER" },
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/recordatorio-prueba" },
  });

  const cronPromoverListaEspera = service("cron-promover-lista-espera", {
    source: cronSource,
    build: cronBuild,
    deploy: { cronSchedule: "*/15 * * * *", restartPolicyType: "NEVER" },
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/promover-lista-espera" },
  });

  const cronReferidosVencidos = service("cron-referidos-vencidos", {
    source: cronSource,
    build: cronBuild,
    deploy: { cronSchedule: "0 9 * * *", restartPolicyType: "NEVER" },
    env: { CRON_SECRET: moveWeb.env.CRON_SECRET, CRON_PATH: "/api/cron/referidos-vencidos" },
  });

  return project("resourceful-dream", {
    resources: [
      moveWeb,
      cronRecordatorioClase,
      cronReservasFinales,
      cronDespuesClase,
      cronLiquidaciones,
      cronConvertirPruebas,
      cronVencerPruebas,
      cronRecordatorioPrueba,
      cronPromoverListaEspera,
      cronReferidosVencidos,
    ],
  });
});
