# TAN Canard (fuente de marca)

TAN Canard es una fuente comercial (no está disponible en Google Fonts), usada
para el wordmark "MOVE" y otros usos puntuales de marca.

## Qué necesito de ti

Cuando tengas la licencia, copia aquí los archivos de la variante **Bold**
(idealmente en formato `.woff2`, que es el más liviano para web) con estos
nombres exactos:

```
src/fonts/tan-canard/TanCanard-Bold.woff2
```

Si tu licencia solo trae `.otf` o `.ttf`, conviértelos a `.woff2` (por ejemplo
con https://transfonter.org) antes de copiarlos, o dime y lo hago yo.

## Cómo se activa

Mientras no exista el archivo, el wordmark "MOVE" usa una fuente de reemplazo
(system serif bold) definida en `src/lib/fonts.ts` y `src/app/globals.css`
para que el proyecto compile sin errores.

Una vez copies el archivo, avísame y:
1. Descomento el bloque `next/font/local` en `src/lib/fonts.ts`.
2. Cambio la variable `--font-tan-canard` para que apunte a la fuente real.

No hace falta ninguna otra acción de tu parte.
