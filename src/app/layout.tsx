import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { poppins, inter } from "@/lib/fonts";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MetaPixel from "@/components/analytics/meta-pixel";
import { GoogleTagManagerScript, GoogleTagManagerNoscript } from "@/components/analytics/google-tag-manager";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "UNIQUE — Entrena en los mejores gimnasios y estudios",
  description:
    "Un solo plan de créditos para acceder a cycling, boxing, yoga y más en los gimnasios y estudios afiliados a UNIQUE.",
  // Para que "Agregar a pantalla de inicio" en iPhone/Android use el ícono
  // real de UNIQUE y abra en modo pantalla completa (sin la barra de
  // Safari/Chrome), en vez de un acceso directo genérico.
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "UNIQUE",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff4f3f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esES}
      signInUrl="/iniciar-sesion"
      signUpUrl="/crear-cuenta"
      appearance={{
        variables: {
          colorPrimary: "#ff4f3f",
          colorForeground: "#063009",
          fontFamily: "var(--font-body)",
        },
      }}
    >
      <html
        lang="es"
        className={`${poppins.variable} ${inter.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <GoogleTagManagerNoscript />
          <GoogleTagManagerScript />
          <MetaPixel />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
