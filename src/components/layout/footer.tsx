import Link from "next/link";
import Image from "next/image";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

const CONTACT_EMAIL = "gerencia@uniqueappcol.com";

export default async function Footer() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-move-green/10 bg-move-green text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Image
              src="/brand/unique-wordmark-white.png"
              alt="UNIQUE"
              width={854}
              height={277}
              className="h-6 w-auto"
            />
            <p className="mt-3 max-w-xs font-body text-sm text-white/70">{dict.footer.tagline}</p>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-lime">
              {dict.footer.contacto}
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-block font-body text-sm text-white/90 underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-lime">
              {dict.footer.politicaCancelacionTitle}
            </p>
            <p className="mt-3 font-body text-sm text-white/70">
              {dict.footer.politicaCancelacionText}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} UNIQUE. {dict.footer.rights}
          </p>
          {/* Anchors nativos a propósito: ver nota en hero.tsx */}
          <nav className="flex gap-6">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/#gimnasios" className="hover:text-white">
              {dict.header.navGimnasios}
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/#planes" className="hover:text-white">
              {dict.header.navPlanes}
            </a>
            <Link href="/sobre-nosotros" className="hover:text-white">
              {dict.header.navSobreNosotros}
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/#contacto" className="hover:text-white">
              {dict.header.navContacto}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
