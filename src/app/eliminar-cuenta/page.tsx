function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold text-move-green">{title}</h2>
      <div className="mt-2 space-y-3 font-body text-sm leading-relaxed text-move-green/80">{children}</div>
    </div>
  );
}

export default function EliminarCuentaPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">
        UNIQUE APP S.A.S. — NIT 902.086.248
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">
        Eliminar tu cuenta de UNIQUE
      </h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-move-green/80">
        Si quieres eliminar tu cuenta de UNIQUE (aplicación de UNIQUE APP S.A.S.) y los datos
        personales asociados, sigue los pasos de esta página.
      </p>

      <Section title="Cómo solicitar la eliminación">
        <p>
          Escríbenos a{" "}
          <a href="mailto:gerencia@uniqueappcol.com" className="text-move-coral underline">
            gerencia@uniqueappcol.com
          </a>{" "}
          desde el correo con el que creaste tu cuenta, indicando en el asunto o el cuerpo del
          mensaje: &quot;Solicito eliminar mi cuenta y mis datos&quot;.
        </p>
        <p>
          Vamos a confirmar tu identidad respondiendo a ese mismo correo, y procesaremos la
          eliminación dentro de los diez (10) días hábiles siguientes. Te avisaremos por correo
          cuando quede completada.
        </p>
      </Section>

      <Section title="Qué datos se eliminan">
        <p>
          Al eliminar tu cuenta, borramos permanentemente: tu nombre y apellido, número de
          documento de identidad, fecha de nacimiento, género, número de teléfono, historial de
          reservas y calificaciones de clases, favoritos guardados, y el token de notificaciones
          push de tu dispositivo. También eliminamos tu cuenta de inicio de sesión (correo y
          contraseña).
        </p>
      </Section>

      <Section title="Qué datos se conservan, y por cuánto tiempo">
        <p>
          Los registros de pagos y transacciones (monto, fecha, gimnasio, plan o créditos
          comprados) se conservan hasta por cinco (5) años después de la eliminación de tu cuenta,
          porque la normativa contable y tributaria colombiana exige mantener soportes de
          transacciones comerciales durante ese período. Desvinculamos esta información de tus
          datos de contacto (correo, teléfono) en cuanto es posible, dejando únicamente lo
          necesario para efectos contables y fiscales.
        </p>
      </Section>

      <Section title="Eliminar solo una parte de tus datos">
        <p>
          Si prefieres no eliminar tu cuenta pero quieres que borremos datos específicos (por
          ejemplo, tu historial de reservas o calificaciones), escríbenos a la misma dirección,{" "}
          <a href="mailto:gerencia@uniqueappcol.com" className="text-move-coral underline">
            gerencia@uniqueappcol.com
          </a>
          , indicando qué información quieres que eliminemos. Aplican los mismos plazos y
          excepciones descritos arriba.
        </p>
      </Section>

      <p className="mt-8 font-body text-xs text-move-green/50">
        Para más detalles sobre cómo tratamos tus datos personales, consulta nuestra{" "}
        <a href="/tratamiento-datos" className="text-move-coral underline">
          Política de Tratamiento de Datos Personales
        </a>
        .
      </p>
    </section>
  );
}
