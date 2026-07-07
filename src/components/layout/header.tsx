import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/#gimnasios", label: "Gimnasios" },
  { href: "/#planes", label: "Planes" },
  { href: "/#contacto", label: "Contacto" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-move-green/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-brand text-2xl font-bold uppercase tracking-tight text-move-green"
        >
          MOVE
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
          <Show when="signed-out">
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
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
