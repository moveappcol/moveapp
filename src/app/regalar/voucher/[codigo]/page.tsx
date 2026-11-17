import { notFound } from "next/navigation";
import { findRegaloByCodigo, fechaLargaRegalo } from "@/lib/regalos";
import { findCatalogItem } from "@/lib/orders";
import VoucherCard from "@/components/regalos/voucher-card";

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const regalo = await findRegaloByCodigo(codigo);
  if (!regalo) notFound();

  const plan = findCatalogItem("regalo", regalo.planId);

  return (
    <section className="bg-move-green px-4 py-16 sm:px-6 print:bg-white">
      <div className="mx-auto max-w-md">
        <VoucherCard
        codigo={regalo.codigo}
        planLabel={`${plan?.name ?? regalo.planId} · ${regalo.meses === 1 ? "1 mes" : `${regalo.meses} meses`}`}
        fechaCompraLabel={fechaLargaRegalo(regalo.fechaCompra)}
        fechaLimiteLabel={fechaLargaRegalo(regalo.fechaLimite)}
        yaCanjeado={regalo.estado === "Activado"}
        />
      </div>
    </section>
  );
}
