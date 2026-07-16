import { SignUp } from "@clerk/nextjs";

export default function CrearCuentaPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <SignUp
        path="/crear-cuenta"
        signInUrl="/iniciar-sesion"
        fallbackRedirectUrl="/completar-perfil"
      />
    </div>
  );
}
