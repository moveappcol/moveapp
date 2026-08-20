function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold text-move-green">{title}</h2>
      <div className="mt-2 space-y-3 font-body text-sm leading-relaxed text-move-green/80">{children}</div>
    </div>
  );
}

export default function TratamientoDatosPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">
        UNIQUE APP S.A.S. — NIT 902.086.248
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">
        Política de Tratamiento de Datos Personales
      </h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-move-green/80">
        En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto
        1074 de 2015) y demás normas concordantes que regulan la protección de datos personales en
        Colombia, UNIQUE APP S.A.S. (NIT 902.086.248), como Responsable del Tratamiento, pone a
        disposición de los Titulares la presente Política de Tratamiento de Datos Personales (en
        adelante, la &quot;Política&quot;).
      </p>

      <Section title="1. Responsable del Tratamiento">
        <p>Razón social: UNIQUE APP S.A.S. — NIT 902.086.248.</p>
        <p>Domicilio: Bogotá D.C., Colombia. Cll 128 A57c - 04.</p>
        <p>
          Correo electrónico de contacto para temas de datos personales:{" "}
          <a href="mailto:uniqueappcol@gmail.com" className="text-move-coral underline">
            uniqueappcol@gmail.com
          </a>
          . Teléfono: 3165351258.
        </p>
        <p>Área o persona responsable de atender consultas y reclamos: Paula Villate.</p>
      </Section>

      <Section title="2. Datos Personales Objeto de Tratamiento">
        <p>
          UNIQUE recolecta, entre otros, los siguientes datos personales de los Usuarios: (i)
          datos de identificación (nombre completo, tipo y número de documento de identidad,
          fecha de nacimiento); (ii) datos de contacto (correo electrónico, número telefónico,
          ciudad de residencia); (iii) datos de la cuenta y uso de la Plataforma (historial de
          reservas, clases tomadas, Gimnasios visitados, calificaciones, créditos consumidos);
          (iv) datos transaccionales asociados al procesamiento de pagos, tratados directamente
          por la pasarela de pagos (UNIQUE no almacena números completos de tarjeta ni códigos de
          seguridad); y (v) datos técnicos de navegación (dirección IP, dispositivo, cookies),
          cuando aplique.
        </p>
        <p>
          UNIQUE no solicita ni pretende tratar datos sensibles (como datos de salud) más allá de
          la información que el propio Usuario decida suministrar voluntariamente respecto de
          condiciones físicas relevantes para su participación en una clase, la cual será tratada
          con confidencialidad reforzada y únicamente para los fines de seguridad del propio
          Usuario. La respuesta a preguntas sobre datos sensibles será facultativa y su
          tratamiento requerirá autorización explícita, separada y verificable del Titular, salvo
          excepción legal.
        </p>
      </Section>

      <Section title="3. Finalidades del Tratamiento">
        <p>
          Los datos personales del Usuario serán tratados para las siguientes finalidades: (i)
          crear, administrar y verificar la cuenta del Usuario; (ii) gestionar las reservas de
          clases y la relación con los Gimnasios Aliados; (iii) procesar pagos y suscripciones;
          (iv) enviar notificaciones operativas relacionadas con el servicio (confirmaciones de
          reserva, recordatorios, cambios de horario); (v) atender solicitudes, quejas y reclamos
          (PQRS); (vi) enviar comunicaciones comerciales y de mercadeo sobre UNIQUE y sus Aliados,
          siempre que el Usuario haya otorgado autorización para dicha finalidad y sin perjuicio
          de su derecho a solicitar la exclusión en cualquier momento; (vii) realizar análisis
          estadísticos y de mejora del servicio; y (viii) dar cumplimiento a obligaciones legales,
          contractuales y requerimientos de autoridades competentes. La autorización para
          comunicaciones comerciales se obtendrá de forma diferenciada y podrá revocarse en
          cualquier momento, sin afectar el tratamiento necesario para prestar el servicio.
        </p>
      </Section>

      <Section title="4. Transferencia y Transmisión de Datos a Terceros — Gimnasios Aliados y Proveedores">
        <p>
          El Usuario acepta y autoriza de forma expresa que, para efectos de permitir el acceso a
          las clases reservadas, UNIQUE comparta con el Gimnasio correspondiente los datos
          estrictamente necesarios para identificar al Usuario y validar su reserva, tales como:
          nombre completo, número de identificación, correo y, cuando aplique, estado de la
          reserva (confirmada, cancelada, asistida). Esta información se comparte únicamente con
          el Gimnasio en el que el Usuario tiene una reserva activa, con el único propósito de
          permitir el control de acceso, la verificación de la identidad del Usuario en recepción
          y la liquidación de los pagos que UNIQUE realiza a dicho Gimnasio con base en las
          reservas confirmadas. No se compartirán datos sensibles con los Gimnasios salvo que sean
          estrictamente necesarios para una finalidad informada y exista autorización explícita o
          habilitación legal.
        </p>
        <p>
          Los Gimnasios Aliados que reciben esta información se obligan contractualmente frente a
          UNIQUE a: (i) usar los datos exclusivamente para los fines de prestación del servicio y
          control de acceso; (ii) no usarlos con fines distintos, en particular no contactar al
          Usuario por fuera de la Plataforma con fines comerciales propios sin autorización
          independiente de este; y (iii) guardar la confidencialidad y seguridad de la información
          recibida, así como eliminarla o dejar de usarla una vez cumplida su finalidad, conforme
          a los términos que se pacten en el respectivo contrato de vinculación entre UNIQUE y el
          Gimnasio.
        </p>
        <p>
          Adicionalmente, UNIQUE podrá compartir datos personales con proveedores tecnológicos que
          le prestan servicios de infraestructura, alojamiento, autenticación, gestión de bases de
          datos y procesamiento de pagos (a título enunciativo: Airtable, Clerk, Railway, Wompi, u
          otros que UNIQUE llegue a contratar), quienes actúan como Encargados del Tratamiento
          bajo instrucciones de UNIQUE y están obligados contractualmente a proteger dicha
          información. Cuando dichos proveedores se encuentren ubicados fuera de Colombia, la
          transferencia o transmisión internacional de datos, según corresponda, se realizará con
          observancia de la Ley 1581 de 2012 y la regulación aplicable, mediante los contratos,
          autorizaciones, excepciones o declaraciones de conformidad exigibles en cada caso.
        </p>
        <p>
          UNIQUE no vende, arrienda ni comercializa datos personales de sus Usuarios a terceros
          para fines distintos a los aquí descritos.
        </p>
      </Section>

      <Section title="5. Derechos de los Titulares">
        <p>
          Conforme a la Ley 1581 de 2012, el Usuario, en calidad de Titular de los datos, tiene
          derecho a: (i) conocer, actualizar y rectificar sus datos personales; (ii) solicitar
          prueba de la autorización otorgada; (iii) ser informado sobre el uso dado a sus datos;
          (iv) presentar quejas ante la Superintendencia de Industria y Comercio por infracciones
          a la ley; (v) revocar la autorización y/o solicitar la supresión del dato, cuando no
          exista un deber legal o contractual que impida su eliminación; y (vi) acceder de forma
          gratuita a sus datos personales que hayan sido objeto de tratamiento.
        </p>
        <p>
          Estos derechos podrán ejercerse mediante solicitud escrita dirigida al correo de
          contacto señalado en la Cláusula 1 de esta Política, indicando su nombre, documento de
          identidad y el objeto de la solicitud. Las consultas se atenderán en un término máximo
          de diez (10) días hábiles, prorrogable por cinco (5) días hábiles, previa información de
          los motivos de la demora. Los reclamos se atenderán en un término máximo de quince (15)
          días hábiles, prorrogable por ocho (8) días hábiles, previa información de los motivos
          de la demora. Si el reclamo está incompleto, se requerirá al solicitante dentro de los
          cinco (5) días hábiles siguientes para que subsane; transcurridos dos (2) meses sin
          respuesta, se entenderá desistido. Recibido el reclamo completo, se incorporará en la
          base de datos la leyenda «reclamo en trámite» dentro de los dos (2) días hábiles
          siguientes. El Titular podrá presentar una queja ante la Superintendencia de Industria y
          Comercio una vez agotado el trámite de consulta o reclamo ante UNIQUE.
        </p>
      </Section>

      <Section title="6. Autorización del Titular">
        <p>
          Al crear una cuenta en la Plataforma, el Usuario otorga a UNIQUE autorización previa,
          expresa e informada para el tratamiento de sus datos personales conforme a las
          finalidades descritas en esta Política, incluyendo la transmisión de los datos
          estrictamente necesarios a los Gimnasios Aliados y a los proveedores tecnológicos
          mencionados. Esta autorización se recabará mediante un mecanismo verificable (casilla de
          aceptación en el proceso de registro) que el Usuario deberá aceptar de forma inequívoca
          antes de poder usar la Plataforma. Las finalidades que requieran autorización
          diferenciada —mercadeo, datos sensibles, uso promocional de la imagen y datos de
          menores— serán presentadas separadamente y no se entenderán autorizadas por la sola
          aceptación general.
        </p>
      </Section>

      <Section title="7. Seguridad de la Información">
        <p>
          UNIQUE implementará medidas técnicas, administrativas y humanas razonables para proteger
          los datos personales contra pérdida, uso indebido, acceso no autorizado, alteración o
          destrucción, de acuerdo con los estándares de seguridad aplicables a plataformas
          tecnológicas y a lo dispuesto por la ley colombiana.
        </p>
      </Section>

      <Section title="8. Vigencia">
        <p>
          Los datos personales serán conservados durante el tiempo en que el Usuario mantenga una
          cuenta activa en la Plataforma y, posteriormente, durante los plazos adicionales que
          exijan las normas contables, fiscales, comerciales o de cualquier otra índole
          aplicables, o hasta que el Titular solicite su supresión y no exista impedimento legal
          para ello.
        </p>
        <p>
          Esta Política rige a partir de su publicación en la Plataforma y podrá ser modificada
          por UNIQUE, informando previamente al Usuario a través de los canales dispuestos para
          tal efecto. Fecha de entrada en vigencia: 1/08/2026. Los cambios sustanciales
          relacionados con la identificación del Responsable o con las finalidades del Tratamiento
          serán comunicados antes de su implementación y darán lugar a una nueva autorización
          cuando sea legalmente exigible.
        </p>
      </Section>
    </section>
  );
}
