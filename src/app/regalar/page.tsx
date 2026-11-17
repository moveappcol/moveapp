import RegalarPage from "@/components/regalos/regalar-page";

export default async function RegalarIndexPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <RegalarPage planInicial="plan-starter" error={error} />;
}
