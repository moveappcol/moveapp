import { SignUp } from "@clerk/nextjs";

/** Mismo flujo de Clerk que /crear-cuenta, pero redirige al panel de
 * gimnasios en vez de a completar-perfil — un gimnasio no necesita cédula
 * ni fecha de nacimiento, eso es solo para clientes que van a reservar. */
export default function GimnasioCrearCuentaPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-move-green/10 bg-move-green/[0.03] p-4">
        <p className="font-heading text-sm font-semibold text-move-green">
          Crea tu cuenta con el correo que ya tenemos registrado
        </p>
        <p className="mt-2 font-body text-xs text-move-green/70">
          Usa el mismo correo que nos diste como contacto de tu gimnasio —
          así se conecta automático a tu panel.
        </p>
      </div>

      <SignUp
        path="/gimnasio/crear-cuenta"
        signInUrl="/gimnasio/iniciar-sesion"
        fallbackRedirectUrl="/gimnasio/panel"
      />
    </div>
  );
}
