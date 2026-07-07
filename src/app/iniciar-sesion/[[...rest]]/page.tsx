import { SignIn } from "@clerk/nextjs";

export default function IniciarSesionPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <SignIn
        path="/iniciar-sesion"
        signUpUrl="/crear-cuenta"
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
