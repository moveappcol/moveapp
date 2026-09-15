/**
 * Caché en memoria del proceso, con vencimiento corto — Railway corre esta
 * app como un proceso persistente (no serverless por request), así que
 * esto sí sirve entre pedidos distintos.
 *
 * El límite real de Airtable es 5 peticiones/segundo por base, fijo en
 * todos los planes — no se sube pagando más. La única forma de aguantar
 * más gente al tiempo es hacer menos llamadas reales a Airtable, así que
 * esto envuelve solo las lecturas de solo-lectura / alto tráfico (lista de
 * gimnasios, info de un gimnasio, lista de clases para mostrar). Nunca se
 * usa en el camino de reservar — esa validación siempre lee fresco para no
 * arriesgar sobrecupo.
 */
const store = new Map<string, { promise: Promise<unknown>; expires: number }>();

/** Guarda la PROMESA en curso (no solo el resultado), así que si dos
 * pedidos llegan casi al tiempo mientras el primero todavía está en vuelo,
 * el segundo espera esa misma promesa en vez de disparar otra llamada a
 * Airtable — evita el "cache stampede". */
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.promise as Promise<T>;
  }

  const promise = fn().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { promise, expires: Date.now() + ttlMs });
  return promise;
}

const locks = new Map<string, Promise<unknown>>();

/** Mutex en memoria del proceso, por llave — mismo fundamento que `cached`
 * (Railway corre esto como proceso persistente). Sirve para serializar dos
 * caminos que pueden llegar casi al mismo tiempo para el MISMO recurso (ej.
 * el webhook de Wompi y la respuesta síncrona del cobro confirmando el
 * mismo pago), donde cada uno leería "todavía no procesado" si no espera
 * al otro. `fn` corre solo cuando le toca el turno; el resultado (o el
 * error) de `fn` es lo que recibe quien llamó. */
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const turn = previous.then(fn, fn);
  locks.set(
    key,
    turn.then(
      () => undefined,
      () => undefined
    )
  );
  return turn;
}
