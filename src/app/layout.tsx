import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { poppins, inter } from "@/lib/fonts";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "MOVE — Entrena en los mejores gimnasios y estudios",
  description:
    "Un solo plan de créditos para acceder a cycling, boxing, yoga y más en los gimnasios y estudios afiliados a MOVE.",
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
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
