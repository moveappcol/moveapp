import RegalarPage from "@/components/regalos/regalar-page";

export default async function RegalarPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { planId } = await params;
  const { error } = await searchParams;
  return <RegalarPage planInicial={planId} error={error === "datos" ? "Revisa tus datos antes de continuar." : error} />;
}
