import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "@/lib/users";
import UserMenu from "./user-menu";

const NAV_LINKS = [
  { href: "/#gimnasios", label: "Gimnasios" },
  { href: "/#planes", label: "Planes" },
  { href: "/#contacto", label: "Contacto" },
];

export default async function Header() {
  const { userId } = await auth();

  let displayName: string | null = null;
  let credits: number | null = null;

  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    displayName = user?.firstName || email || "Cuenta";

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
    <header className="sticky top-0 z-50 border-b border-move-green/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-brand text-2xl font-bold uppercase tracking-tight text-move-green"
        >
          UNIQUE
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-sm font-medium text-move-green transition-colors hover:text-move-coral"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {userId ? (
            <>
              <div className="text-right">
                <p className="hidden font-heading text-sm font-semibold leading-tight text-move-green sm:block">
                  {displayName}
                </p>
                <p className="font-body text-xs font-semibold leading-tight text-move-green/70 sm:font-normal sm:text-move-green/60">
                  {credits !== null ? `${credits} créditos` : "—"}
                </p>
              </div>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/iniciar-sesion"
                className="font-heading text-sm font-medium text-move-green transition-colors hover:text-move-coral"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/crear-cuenta"
                className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
