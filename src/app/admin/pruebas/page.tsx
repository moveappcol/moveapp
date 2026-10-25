import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAllPruebas } from "@/lib/pruebas";
import { formatCOP } from "@/lib/credits-pricing";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Quién puede ver /admin/pruebas — lista separada por comas en
 * ADMIN_EMAILS (ver .env.local), por si más adelante hay que darle acceso
 * a alguien más del equipo sin tocar código. Siempre incluye a
 * OWNER_EMAIL aunque la variable no esté configurada. */
function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [OWNER_EMAIL.toLowerCase(), ...extra];
}

const ESTADO_STYLES: Record<string, string> = {
  Activa: "bg-move-lime/40 text-move-green",
  Cancelada: "bg-move-green/10 text-move-green/70",
  Convertida: "bg-move-green text-white",
  "Cobro fallido": "bg-move-coral/15 text-move-coral",
  Reembolsada: "bg-move-coral/15 text-move-coral",
};

function formatFechaHora(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Panel mínimo para ver el estado de todas las Pruebas UNIQUE y la tasa
 * de conversión al Starter — protegido por allowlist de correo (ver
 * adminEmails), no por el auth de gerente de gimnasio ni el de cliente. */
export default async function AdminPruebasPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    redirect("/");
  }

  const pruebas = await getAllPruebas();
  const convertidas = pruebas.filter((p) => p.estado === "Convertida").length;
  const tasaConversion = pruebas.length > 0 ? Math.round((convertidas / pruebas.length) * 100) : 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">Pruebas UNIQUE</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-move-green/10 bg-white p-5">
          <p className="font-body text-xs uppercase tracking-wide text-move-green/50">Total</p>
          <p className="mt-1 font-heading text-3xl font-bold text-move-green">{pruebas.length}</p>
        </div>
        <div className="rounded-2xl border border-move-green/10 bg-white p-5">
          <p className="font-body text-xs uppercase tracking-wide text-move-green/50">Convertidas</p>
          <p className="mt-1 font-heading text-3xl font-bold text-move-green">{convertidas}</p>
        </div>
        <div className="rounded-2xl border border-move-coral/20 bg-white p-5">
          <p className="font-body text-xs uppercase tracking-wide text-move-green/50">% conversión</p>
          <p className="mt-1 font-heading text-3xl font-bold text-move-coral">{tasaConversion}%</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-move-green/10 bg-white">
        <table className="w-full min-w-[640px] text-left font-body text-sm">
          <thead>
            <tr className="border-b border-move-green/10 text-xs uppercase tracking-wide text-move-green/50">
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Compra</th>
              <th className="px-4 py-3">Fin</th>
              <th className="px-4 py-3">Créditos</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pruebas.map((prueba) => (
              <tr key={prueba.id} className="border-b border-move-green/5 last:border-0">
                <td className="px-4 py-3 text-move-green">{prueba.correo}</td>
                <td className="px-4 py-3 text-move-green/70">{formatFechaHora(prueba.fechaInicio)}</td>
                <td className="px-4 py-3 text-move-green/70">{formatFechaHora(prueba.fechaFin)}</td>
                <td className="px-4 py-3 text-move-green/70">{prueba.creditosOtorgados}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 font-heading text-xs font-semibold ${
                      ESTADO_STYLES[prueba.estado] ?? "bg-move-green/10 text-move-green/70"
                    }`}
                  >
                    {prueba.estado}
                  </span>
                </td>
              </tr>
            ))}
            {pruebas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-move-green/50">
                  Todavía no hay ninguna Prueba UNIQUE comprada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-body text-xs text-move-green/50">
        Precio de la prueba: {formatCOP(69_000)} · Starter al convertir: {formatCOP(209_900)}/mes.
      </p>
    </section>
  );
}
