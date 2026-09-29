import CanjearForm from "@/components/regalos/canjear-form";

export default async function CanjearPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">Activa tu regalo</h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        Ingresa el código que te compartieron y el correo donde quieres tus créditos.
      </p>
      <div className="mt-8">
        <CanjearForm codigoInicial={(codigo ?? "").toUpperCase()} />
      </div>
    </section>
  );
}
