import { vi, type Mock } from "vitest";

/** Simula un record de Airtable: {id, fields} con un .get() como el real,
 * y _rawJson.createdTime porque algún código de lectura lo usa (ej.
 * notificaciones.ts, no tocado por estos tests, pero mantenemos la forma
 * real por si algo más lo necesita). */
export function fakeRecord(id: string, fields: Record<string, unknown>) {
  return {
    id,
    get: (field: string) => fields[field],
    _rawJson: { createdTime: new Date().toISOString() },
  };
}

export type FakeTable = {
  select: Mock;
  create: Mock;
  update: Mock;
  find: Mock;
  destroy: Mock;
};

/** Una tabla falsa — por defecto `.select().all()` devuelve `records`;
 * cada test puede sobreescribir create/update/find con sus propios
 * vi.fn() si necesita espiar o cambiar el comportamiento. */
export function fakeTable(records: ReturnType<typeof fakeRecord>[] = []): FakeTable {
  return {
    select: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(records) }),
    create: vi.fn().mockImplementation(async (rows: { fields: Record<string, unknown> }[]) =>
      rows.map((r, i) => fakeRecord(`new${i}`, r.fields))
    ),
    update: vi.fn().mockImplementation(async (rows: { id: string; fields: Record<string, unknown> }[]) =>
      rows.map((r) => fakeRecord(r.id, r.fields))
    ),
    find: vi.fn().mockImplementation(async () => {
      throw new Error("Record not found");
    }),
    destroy: vi.fn().mockResolvedValue([]),
  };
}

/** `base("NombreTabla")` — igual que el real `getAirtableBase()`, pero
 * respaldado por las tablas falsas que arme cada test. Lanza si el código
 * bajo prueba toca una tabla que el test no preparó (mejor eso que un
 * `undefined.select is not a function` confuso). */
export function fakeBase(tables: Record<string, FakeTable>) {
  return vi.fn((tableName: string) => {
    const table = tables[tableName];
    if (!table) throw new Error(`Mock de Airtable sin configurar para la tabla "${tableName}".`);
    return table;
  });
}
