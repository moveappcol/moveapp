import Link from "next/link";
import Image from "next/image";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "@/lib/users";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import UserMenu from "./user-menu";
import MobileNav from "./mobile-nav";
import LanguageToggle from "./language-toggle";

export default async function Header() {
  const { userId } = await auth();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const NAV_LINKS = [
    { href: "/#gimnasios", label: dict.header.navGimnasios },
    { href: "/#planes", label: dict.header.navPlanes },
    { href: "/como-funciona", label: dict.header.navComoFunciona },
    { href: "/sobre-nosotros", label: dict.header.navSobreNosotros },
    { href: "/#contacto", label: dict.header.navContacto },
  ];

  const SIGNED_IN_NAV_LINKS = [
    { href: "/mis-reservas", label: dict.header.navMisReservas },
    { href: "/mi-suscripcion", label: dict.header.navMiSuscripcion },
  ];

  const navLinks = userId ? [...NAV_LINKS, ...SIGNED_IN_NAV_LINKS] : NAV_LINKS;

  let displayName: string | null = null;
  let credits: number | null = null;

  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    displayName = user?.firstName || email || dict.header.account;

    if (email) {
      try {
        const account = await getUserCreditsByEmail(email);
        credits = account?.credits ?? 0;
      } catch {
        credits = null;
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-move-green/10 bg-background/95 backdrop-blur relative">
      {/* relative: ancla el panel del menú móvil (ver mobile-nav.tsx) */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="block">
          <Image
            src="/brand/unique-wordmark.png"
            alt="UNIQUE"
            width={854}
            height={277}
            className="h-6 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) =>
            link.href.startsWith("/#") ? (
              <a
                key={link.href}
                href={link.href}
                className="font-heading text-sm font-medium text-move-green transition-colors hover:text-move-coral"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="font-heading text-sm font-medium text-move-green transition-colors hover:text-move-coral"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle locale={locale} />
          {userId ? (
            <>
              <div className="text-right">
                <p className="hidden font-heading text-sm font-semibold leading-tight text-move-green sm:block">
                  {displayName}
                </p>
                <p className="font-body text-xs font-semibold leading-tight text-move-green/70 sm:font-normal sm:text-move-green/60">
                  {credits !== null ? `${credits} ${dict.common.credits}` : "—"}
                </p>
              </div>
              <UserMenu
                labels={{
                  misReservas: dict.header.navMisReservas,
                  miSuscripcion: dict.header.navMiSuscripcion,
                }}
              />
            </>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/iniciar-sesion"
                className="font-heading text-sm font-medium text-move-green transition-colors hover:text-move-coral"
              >
                {dict.common.signIn}
              </Link>
              <Link
                href="/crear-cuenta"
                className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {dict.common.createAccount}
              </Link>
            </div>
          )}
          <MobileNav
            links={navLinks}
            showAuthLinks={!userId}
            labels={{
              open: dict.header.openMenu,
              close: dict.header.closeMenu,
              signIn: dict.common.signIn,
              createAccount: dict.common.createAccount,
            }}
          />
        </div>
      </div>
    </header>
  );
}
