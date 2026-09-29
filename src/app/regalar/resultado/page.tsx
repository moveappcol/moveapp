import Link from "next/link";
import { fetchTransaction } from "@/lib/wompi";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  APPROVED: {
    title: "¡Listo! Tu regalo está en camino 🎁",
    body: "Te acabamos de mandar el código por correo, con el link para verlo, imprimirlo o enviárselo directo a quien se lo vas a regalar.",
  },
  DECLINED: {
    title: "El pago fue rechazado",
    body: "Tu banco no aprobó el pago. Intenta de nuevo con otra tarjeta.",
  },
  PENDING: {
    title: "Tu pago está pendiente",
    body: "En cuanto se confirme te mandamos el código de tu regalo por correo.",
  },
  VOIDED: {
    title: "El pago fue anulado",
    body: "Este pago no se llegó a completar.",
  },
  ERROR: {
    title: "Algo salió mal",
    body: "Hubo un error procesando tu pago. Intenta de nuevo.",
  },
};

export default async function RegalarResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const tx = id ? await fetchTransaction(id) : null;
  const copy = tx ? STATUS_COPY[tx.status] : null;

  return (
    <section className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">
        {copy?.title ?? "No encontramos ese pago"}
      </h1>
      <p className="mt-3 font-body text-sm text-move-green/70">
        {copy?.body ?? "Revisa el link o escríbenos si acabas de pagar."}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
