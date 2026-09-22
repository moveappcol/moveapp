import type { Metadata } from "next";
import InstalarGuide from "@/components/instalar/instalar-guide";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Instala UNIQUE en tu celular",
  description:
    "Agrega la app de UNIQUE a tu pantalla de inicio en menos de un minuto, directo desde el navegador.",
};

export default async function InstalarPage() {
  const t = getDictionary(await getLocale()).instalar;
  return <InstalarGuide t={t} />;
}
