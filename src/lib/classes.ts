import { getAirtableBase } from "./airtable";
import { cached, invalidate } from "./server-cache";
import { toBogotaDateString } from "./liquidaciones";

const CACHE_TTL_MS = 5_000;
const CLASES_CON_CUPOS_CACHE_KEY = "classes:allWithCupos";

/** Llamar después de cualquier escritura que cambie cuántos cupos quedan
 * ocupados (reservar, cancelar) — si no, la próxima persona que vea la
 * lista de clases puede seguir viendo el cupo de antes de esa escritura
 * hasta por CACHE_TTL_MS, que es justo la ventana en la que alguien suele
 * mirar después de reservar. */
export function invalidateClasesCupos(): void {
  invalidate(CLASES_CON_CUPOS_CACHE_KEY);
}

/** "A" (40%) o "B" (30%) — según cuándo el gimnasio le dio ese cupo a
 * UNIQUE: a tiempo (A) o de último momento/el mismo día (B). Es del
 * CUPO, no de la persona que reserva: si el gimnasio da un cupo tarde
 * para un horario que normalmente es A, esa sesión se crea como una fila
 * de Clase aparte marcada B, en vez de reutilizar la fila A existente. */
export type TipoClase = "A" | "B" | null;

export type Clase = {
  id: string;
  name: string;
  credits: number;
  /** Créditos con descuento, si el staff le puso una promoción a esta
   * clase — menor que `credits`. null si no tiene descuento. */
  descuentoCreditos: number | null;
  /** Precio en pesos de esta clase específica, para liquidaciones — nunca
   * se le muestra al usuario. null = usa el precio del gimnasio. */
  precio: number | null;
  /** Ver TipoClase — null hasta que el staff lo clasifique en Airtable
   * (la liquidación de esa clase queda en $0 hasta entonces). */
  tipo: TipoClase;
  cuposTotales: number;
  cuposDisponibles: number;
  fecha: string | null;
  gimnasioId: string | null;
  duracionMinutos: number;
  /** Actividad de esta clase puntual (Yoga, Boxing, etc.) — null si el
   * staff del gimnasio todavía no la clasificó. Es distinto de las
   * "Actividades" del gimnasio (que son varias, el conjunto que ofrece en
   * general): esto es una sola, la de esta clase específica. Se usa para
   * el filtro de actividad del explorador "por día"; mientras no esté
   * puesta, ese filtro cae de vuelta a las actividades del gimnasio. */
  actividad: string | null;
  /** Descripción de la clase (de qué se trata) — opcional, null si el staff
   * todavía no la puso en Airtable. */
  descripcion: string | null;
};

/** Los créditos que realmente se cobran al reservar — el descuento si
 * aplica, si no el precio normal. */
export function precioEfectivo(clase: Pick<Clase, "credits" | "descuentoCreditos">): number {
  return clase.descuentoCreditos !== null && clase.descuentoCreditos < clase.credits
    ? clase.descuentoCreditos
    : clase.credits;
}

/**
 * Esquema en Airtable — tabla "Clases":
 *   - Clase          (texto, nombre de la clase)
 *   - Creditos       (número)
 *   - "Descuento creditos" (número, opcional — precio promocional en
 *      créditos, menor que Creditos; vacío = sin descuento)
 *   - Precio         (número, opcional — precio en pesos de esta clase para
 *      liquidaciones; vacío = usa "Precio por reserva" del gimnasio)
 *   - Tipo           (selección: "A" | "B", opcional — ver TipoClase arriba;
 *      vacío = la liquidación de esta clase queda en $0 hasta que se
 *      clasifique)
 *   - Cupos totales  (número)
 *   - Horario        (fecha y hora — cada fila es una sesión específica,
 *                      no un horario recurrente)
 *   - "Gimnasio "    (link a Gimnasios — OJO: el nombre real trae un espacio al final)
 *   - Actividad      (selección, opcional — Yoga/Boxing/Cycling/etc. de
 *      esta clase puntual; vacío = todavía no clasificada, el filtro de
 *      actividad del explorador "por día" cae de vuelta a las actividades
 *      del gimnasio)
 *   - Duración        (campo tipo Duration de Airtable — la API SIEMPRE lo
 *      devuelve en SEGUNDOS sin importar el formato que se vea en la
 *      interfaz (m:ss, h:mm:ss, etc.), opcional — si está vacío se asume
 *      60 min; se usa para saber cuándo termina la clase: calificaciones y
 *      el correo "AFTER CLASS". Ojo con este campo — ver DEFAULT_DURACION_MINUTOS.)
 *   - "Descripción "  (texto largo, opcional — OJO: trae un espacio al
 *      final del nombre del campo; se le muestra a la persona al ver la
 *      clase)
 *
 * "Numero", "Reservas" y "Reservas 2" existen pero no se usan aquí.
 *
 * Los cupos disponibles se calculan (no se guardan): Cupos totales menos el
 * número de Reservas activas (Estado = "Reservado") para esa clase.
 */
const GIMNASIO_FIELD = "Gimnasio ";
const DESCRIPCION_FIELD = "Descripción ";
const DEFAULT_DURACION_MINUTOS = 60;

async function getActiveReservationCounts(): Promise<Map<string, number>> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({ filterByFormula: '{Estado} = "Reservado"' })
    .all();

  const counts = new Map<string, number>();
  for (const record of records) {
    const claseId = (record.get("Clase") as string[] | undefined)?.[0];
    if (!claseId) continue;
    counts.set(claseId, (counts.get(claseId) ?? 0) + 1);
  }
  return counts;
}

export async function countActiveReservationsForClase(claseId: string): Promise<number> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({ filterByFormula: '{Estado} = "Reservado"' })
    .all();
  return records.filter((r) => (r.get("Clase") as string[] | undefined)?.[0] === claseId)
    .length;
}

/** Lee un campo de selección de Airtable sin asumir si quedó configurado
 * como selección única (llega como string) o múltiple (llega como
 * array) — para no reventar si alguien lo crea distinto a lo esperado.
 * Con selección múltiple, se queda con el primer valor. */
function firstSelectValue(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function mapRecordToClase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any,
  reservados: number
): Clase {
  const gimnasio = record.get(GIMNASIO_FIELD) as string[] | undefined;
  const cuposTotales = (record.get("Cupos totales") as number) ?? 0;
  const duracion = record.get("Duración") as number | undefined;
  const descuento = record.get("Descuento creditos") as number | undefined;
  const precio = record.get("Precio") as number | undefined;
  const tipo = firstSelectValue(record.get("Tipo"));
  const actividad = firstSelectValue(record.get("Actividad"));
  const descripcion = (record.get(DESCRIPCION_FIELD) as string)?.trim();
  return {
    id: record.id,
    name: (record.get("Clase") as string)?.trim() ?? "Sin nombre",
    credits: (record.get("Creditos") as number) ?? 0,
    descuentoCreditos: descuento !== undefined && descuento !== null ? descuento : null,
    precio: precio !== undefined && precio !== null ? precio : null,
    tipo: tipo === "A" || tipo === "B" ? tipo : null,
    cuposTotales,
    cuposDisponibles: Math.max(0, cuposTotales - reservados),
    fecha: (record.get("Horario") as string) ?? null,
    gimnasioId: gimnasio?.[0] ?? null,
    // El campo "Duración" es un Duration de Airtable → llega en segundos.
    duracionMinutos: duracion && duracion > 0 ? duracion / 60 : DEFAULT_DURACION_MINUTOS,
    actividad: actividad || null,
    descripcion: descripcion || null,
  };
}

/** Trae TODAS las clases con sus cupos calculados — es lo mismo sin
 * importar de qué gimnasio se pida, así que se cachea una sola vez (unos
 * segundos) y cada gimnasio filtra sobre el mismo resultado en vez de
 * repetir 2 escaneos completos de Airtable por cada uno que se visite. */
async function getAllClasesConCupos(): Promise<Clase[]> {
  return cached(CLASES_CON_CUPOS_CACHE_KEY, CACHE_TTL_MS, async () => {
    const base = getAirtableBase();
    // Se filtra en JS en vez de con filterByFormula: ARRAYJOIN sobre un campo
    // de enlace concatena los nombres de los registros vinculados, no sus IDs,
    // así que no se puede buscar el gimnasioId directamente en una fórmula.
    const [records, activeCounts] = await Promise.all([
      base("Clases").select().all(),
      getActiveReservationCounts(),
    ]);

    return records
      .filter((record) => Boolean(record.get("Clase")))
      .map((record) => mapRecordToClase(record, activeCounts.get(record.id) ?? 0));
  });
}

export async function getClassesForGym(gimnasioId: string): Promise<Clase[]> {
  const clases = await getAllClasesConCupos();
  return clases
    .filter((clase) => clase.gimnasioId === gimnasioId)
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
}

/** Todas las clases de todos los gimnasios, con cupos — para la vista "Por
 * día" que agrega clases de toda la red en una sola lista. Reutiliza el
 * mismo resultado cacheado que getClassesForGym, así que no cuesta un
 * escaneo extra de Airtable. */
export async function getAllClasesDeTodosLosGimnasios(): Promise<Clase[]> {
  const clases = await getAllClasesConCupos();
  return clases
    .filter((clase) => clase.gimnasioId !== null)
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
}

/** Todas las clases con fecha, de cualquier gimnasio — usado por el cron de
 * liquidaciones (no necesita cupos disponibles, así que no calcula reservas
 * activas por clase). */
export async function getAllClasesConFecha(): Promise<Clase[]> {
  const base = getAirtableBase();
  const records = await base("Clases").select().all();
  return records
    .filter((record) => Boolean(record.get("Clase")) && Boolean(record.get("Horario")))
    .map((record) => mapRecordToClase(record, 0));
}

export type UpdateCuposResult = { ok: true } | { ok: false; error: string };

/** Actualiza "Cupos totales" de una clase — para el panel de gimnasios
 * (ver /gimnasio/panel). Siempre revisa que la clase sea de verdad de ese
 * gimnasio antes de escribir: sin este chequeo, un gimnasio podría
 * editarle los cupos a otro con solo adivinar/probar un id de clase. */
export async function updateCuposTotales(
  claseId: string,
  gimnasioId: string,
  nuevoCupos: number
): Promise<UpdateCuposResult> {
  if (!Number.isInteger(nuevoCupos) || nuevoCupos < 0) {
    return { ok: false, error: "Los cupos deben ser un número entero mayor o igual a 0." };
  }

  const base = getAirtableBase();
  const record = await base("Clases").find(claseId).catch(() => null);
  if (!record) return { ok: false, error: "Esa clase no existe." };

  const gimnasio = record.get(GIMNASIO_FIELD) as string[] | undefined;
  if (gimnasio?.[0] !== gimnasioId) {
    return { ok: false, error: "Esa clase no es de tu gimnasio." };
  }

  await base("Clases").update([{ id: claseId, fields: { "Cupos totales": nuevoCupos } }], {
    typecast: true,
  });
  invalidateClasesCupos();
  return { ok: true };
}

export async function getClaseById(id: string): Promise<Clase | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Clases").find(id);
    const reservados = await countActiveReservationsForClase(id);
    return mapRecordToClase(record, reservados);
  } catch {
    return null;
  }
}

/** Igual que getClaseById pero sin calcular cuposDisponibles (evita un
 * escaneo completo de "Reservas" por cada llamada) — para listas como "Mis
 * reservas" que no muestran cupos, solo nombre/fecha/duración. */
export async function getClaseByIdBasic(id: string): Promise<Clase | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Clases").find(id);
    return mapRecordToClase(record, 0);
  } catch {
    return null;
  }
}

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hace rodar el calendario de clases semana a semana sin que nadie tenga
 * que volver a cargarlas — pensada para correr una vez al día (ver
 * /api/cron/renovar-clases). Para cada clase cuyo DÍA (hora de Bogotá) ya
 * terminó por completo, crea la misma clase una semana después (+7 días
 * exactos, misma hora del día) con los mismos cupos que tenía en ese
 * momento — así, si el gimnasio los cambió antes de que pasara el día, esos
 * son los que se replican.
 *
 * A propósito crea una fila NUEVA en vez de mover la fecha de la fila vieja:
 * los cupos disponibles de una clase se calculan contando cuántas
 * "Reservas" con Estado="Reservado" están linkeadas a su id (ver
 * countActiveReservationsForClase) — si moviéramos la fecha de la fila
 * vieja, las reservas de la semana que ya pasó seguirían contando contra
 * los cupos de la semana nueva. Con una fila nueva, arranca en 0 reservas,
 * como corresponde. Nunca toca "Reservas".
 *
 * Idempotente: antes de crear, revisa si ya existe una clase del mismo
 * gimnasio con el mismo nombre y el horario exacto de la semana siguiente
 * (por si el cron ya corrió, o alguien ya la cargó a mano) — así se puede
 * correr todos los días sin duplicar nada.
 */
export async function renovarClasesPasadas(): Promise<{ creadas: number }> {
  const base = getAirtableBase();
  const records = await base("Clases")
    .select({ filterByFormula: 'AND({Clase} != "", {Horario} != "")' })
    .all();

  const hoy = toBogotaDateString(new Date().toISOString());

  const existentes = new Set(
    records.map((r) => {
      const gimnasioId = (r.get(GIMNASIO_FIELD) as string[] | undefined)?.[0] ?? "";
      const nombre = ((r.get("Clase") as string) ?? "").trim();
      const horario = (r.get("Horario") as string) ?? "";
      return `${gimnasioId}|${nombre}|${horario}`;
    })
  );

  type ClaseFieldValue = string | number | boolean | string[] | undefined;
  const porCrear: { fields: Record<string, ClaseFieldValue> }[] = [];

  for (const record of records) {
    const horario = record.get("Horario") as string;
    if (toBogotaDateString(horario) >= hoy) continue; // ese día todavía no termina

    const gimnasio = (record.get(GIMNASIO_FIELD) as string[] | undefined) ?? [];
    if (gimnasio.length === 0) continue;

    const nombre = ((record.get("Clase") as string) ?? "").trim();
    const siguienteHorario = new Date(new Date(horario).getTime() + SIETE_DIAS_MS).toISOString();
    const clave = `${gimnasio[0]}|${nombre}|${siguienteHorario}`;
    if (existentes.has(clave)) continue;

    const fields: Record<string, ClaseFieldValue> = {
      Clase: nombre,
      Creditos: (record.get("Creditos") as number) ?? 0,
      "Cupos totales": (record.get("Cupos totales") as number) ?? 0,
      Horario: siguienteHorario,
      [GIMNASIO_FIELD]: gimnasio,
    };
    const descuento = record.get("Descuento creditos") as number | undefined;
    if (descuento !== undefined && descuento !== null) fields["Descuento creditos"] = descuento;
    const precio = record.get("Precio") as number | undefined;
    if (precio !== undefined && precio !== null) fields.Precio = precio;
    const tipo = record.get("Tipo") as string | undefined;
    if (tipo) fields.Tipo = tipo;
    const actividad = record.get("Actividad") as string | undefined;
    if (actividad) fields.Actividad = actividad;
    const descripcion = record.get(DESCRIPCION_FIELD) as string | undefined;
    if (descripcion) fields[DESCRIPCION_FIELD] = descripcion;
    const duracion = record.get("Duración") as number | undefined;
    if (duracion !== undefined && duracion !== null) fields["Duración"] = duracion;

    porCrear.push({ fields });
    existentes.add(clave);
  }

  for (let i = 0; i < porCrear.length; i += 10) {
    await base("Clases").create(porCrear.slice(i, i + 10), { typecast: true });
  }

  if (porCrear.length > 0) invalidateClasesCupos();
  return { creadas: porCrear.length };
}
