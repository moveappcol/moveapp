import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // El optimizador de imágenes de Next (/_next/image) da 404 en el
  // despliegue de respaldo en Vercel (confirmado: el archivo crudo sí
  // carga, solo la ruta optimizada falla) — probablemente por cómo quedó
  // este proyecto en particular, creado por CLI en vez de la integración
  // normal de Git. Mientras se usa ese respaldo, se sirven las imágenes
  // tal cual, sin optimizar, detectando la plataforma con la variable que
  // Vercel pone sola en todos sus despliegues — en Railway esta variable
  // no existe, así que ahí sigue optimizando normal.
  images: {
    unoptimized: Boolean(process.env.VERCEL),
  },
};

export default nextConfig;
