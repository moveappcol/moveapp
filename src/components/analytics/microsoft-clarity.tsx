import Script from "next/script";

/** Grabaciones de sesión reales + mapas de calor + scroll + clics de
 * frustración — a diferencia del pixel de Meta y de GTM, esto no sirve para
 * mandarle datos a ningún anunciante, es solo para que el equipo pueda VER
 * cómo navega la gente de verdad por el sitio, en clarity.microsoft.com.
 * No se puede crear la cuenta/proyecto de Clarity desde acá (requiere login
 * propio del dueño) — hasta que exista NEXT_PUBLIC_CLARITY_PROJECT_ID en el
 * entorno, este componente no renderiza nada, así que no rompe nada en
 * producción mientras tanto. */
export default function MicrosoftClarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  );
}
