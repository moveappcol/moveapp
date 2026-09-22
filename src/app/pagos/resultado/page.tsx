import Link from "next/link";
import { fetchTransaction } from "@/lib/wompi";
import PurchaseTracker from "@/components/analytics/purchase-tracker";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PagoResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const t = getDictionary(await getLocale()).pagos.resultado;

  const STATUS_COPY: Record<string, { title: string; body: string }> = {
    APPROVED: { title: t.approvedTitle, body: t.approvedBody },
    DECLINED: { title: t.declinedTitle, body: t.declinedBody },
    PENDING: { title: t.pendingTitle, body: t.pendingBody },
    VOIDED: { title: t.voidedTitle, body: t.voidedBody },
    ERROR: { title: t.errorTitle, body: t.errorBody },
  };

  const { id } = await searchParams;
  const tx = id ? await fetchTransaction(id) : null;
  const copy = tx ? STATUS_COPY[tx.status] : null;

  return (
    <section className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      {tx?.status === "APPROVED" && (
        <PurchaseTracker transactionId={tx.id} value={tx.amountInCents / 100} />
      )}
      <h1 className="font-heading text-2xl font-bold text-move-green">
        {copy?.title ?? t.notFoundTitle}
      </h1>
      <p className="mt-3 font-body text-sm text-move-green/70">{copy?.body ?? t.notFoundBody}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t.volverAlInicio}
      </Link>
    </section>
  );
}
