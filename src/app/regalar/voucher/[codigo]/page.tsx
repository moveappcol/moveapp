import { notFound } from "next/navigation";
import { findRegaloByCodigo } from "@/lib/regalos";
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
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <VoucherCard
        codigo={regalo.codigo}
        planLabel={plan?.name ?? plan?.label ?? regalo.planId}
        fechaLimiteLabel={new Date(regalo.fechaLimite).toLocaleDateString("es-CO", {
          timeZone: "America/Bogota",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        yaCanjeado={regalo.estado === "Activado"}
      />
    </section>
  );
}
