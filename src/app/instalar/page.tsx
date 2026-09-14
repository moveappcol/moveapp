import type { Metadata } from "next";
import InstalarGuide from "@/components/instalar/instalar-guide";

export const metadata: Metadata = {
  title: "Instala UNIQUE en tu celular",
  description:
    "Agrega UNIQUE a tu pantalla de inicio en menos de un minuto y ábrela como una app, directo desde el navegador.",
};

export default function InstalarPage() {
  return <InstalarGuide />;
}
