import Link from "next/link";
import { fetchTransaction } from "@/lib/wompi";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  APPROVED: {
    title: "¡Pago aprobado!",
    body: "Tus créditos ya deberían estar disponibles en tu cuenta. Si no los ves en un par de minutos, escríbenos a gerencia@uniqueapp.com.co.",
  },
  DECLINED: {
    title: "Pago rechazado",
    body: "Tu pago no fue aprobado. No se hizo ningún cobro. Puedes intentar de nuevo con otro medio de pago.",
  },
  PENDING: {
    title: "Pago en proceso",
    body: "Estamos confirmando tu pago. Te acreditaremos los créditos apenas Wompi nos confirme la transacción.",
  },
  VOIDED: {
    title: "Pago anulado",
    body: "Esta transacción fue anulada. No se hizo ningún cobro.",
  },
  ERROR: {
    title: "Ocurrió un error",
    body: "No pudimos procesar tu pago. Puedes intentar de nuevo o escribirnos a gerencia@uniqueapp.com.co.",
  },
};

export default async function PagoResultadoPage({
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
        {copy?.title ?? "No encontramos esa transacción"}
      </h1>
      <p className="mt-3 font-body text-sm text-move-green/70">
        {copy?.body ??
          "No pudimos verificar el estado de este pago. Si crees que es un error, escríbenos a gerencia@uniqueapp.com.co."}
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
