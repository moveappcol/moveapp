import { SignUp } from "@clerk/nextjs";

export default function CrearCuentaPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-move-green/10 bg-move-green/[0.03] p-4">
        <p className="font-heading text-sm font-semibold text-move-green">
          Requisitos de la contraseña
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 font-body text-xs text-move-green/70">
          <li>Mínimo 8 caracteres.</li>
          <li>No puede ser una contraseña común ni haber aparecido en una filtración de seguridad conocida.</li>
          <li>Se recomienda combinar letras, números y símbolos, y evitar palabras comunes.</li>
        </ul>
      </div>

      <SignUp
        path="/crear-cuenta"
        signInUrl="/iniciar-sesion"
        fallbackRedirectUrl="/completar-perfil"
      />
    </div>
  );
}
