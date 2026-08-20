function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold text-move-green">{title}</h2>
      <div className="mt-2 space-y-3 font-body text-sm leading-relaxed text-move-green/80">{children}</div>
    </div>
  );
}

export default function TerminosPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">
        UNIQUE APP S.A.S. — NIT 902.086.248
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">
        Términos y Condiciones de Uso
      </h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-move-green/80">
        Los presentes Términos y Condiciones (en adelante, los &quot;Términos&quot;) regulan el
        acceso y uso de la plataforma UNIQUE (en adelante, la &quot;Plataforma&quot;), operada por
        UNIQUE APP S.A.S., sociedad comercial identificada con NIT 902.086.248, domiciliada en
        Bogotá D.C., Colombia (en adelante, &quot;UNIQUE&quot;, &quot;la Empresa&quot;,
        &quot;nosotros&quot;). Al crear una cuenta, adquirir una suscripción o usar la Plataforma
        de cualquier forma, el usuario (en adelante, el &quot;Usuario&quot;) declara haber leído,
        entendido y aceptado íntegramente estos Términos.
      </p>

      <Section title="1. Objeto de la Plataforma">
        <p>
          UNIQUE es una plataforma tecnológica que permite a los Usuarios acceder, mediante un
          sistema de suscripción por créditos, a clases y servicios ofrecidos por estudios y
          gimnasios independientes aliados (en adelante, los &quot;Gimnasios&quot; o
          &quot;Aliados&quot;) en la ciudad de Bogotá y demás ciudades donde opere el servicio.
        </p>
        <p>
          UNIQUE actúa exclusivamente como intermediario tecnológico entre los Usuarios y los
          Gimnasios. UNIQUE no opera, administra, presta directamente, ni es responsable de las
          instalaciones, instructores, equipos o clases ofrecidas por los Gimnasios. La relación
          de prestación del servicio deportivo o de acondicionamiento físico se establece
          directamente entre el Usuario y el Gimnasio correspondiente. Lo anterior se entiende sin
          perjuicio de las obligaciones que legalmente correspondan a UNIQUE por la operación de
          la Plataforma y de los derechos irrenunciables del consumidor.
        </p>
      </Section>

      <Section title="2. Cuenta de Usuario">
        <p>
          Para usar la Plataforma, el Usuario debe crear una cuenta suministrando información
          veraz, completa y actualizada. El Usuario es el único responsable de la confidencialidad
          de sus credenciales de acceso y de toda actividad realizada desde su cuenta.
        </p>
        <p>
          UNIQUE se reserva el derecho de suspender o cancelar cuentas que suministren información
          falsa, incompleta, o que incumplan estos Términos, sin que ello genere derecho a
          indemnización alguna a favor del Usuario. La medida deberá ser razonable y proporcional
          al incumplimiento identificado.
        </p>
        <p>El uso de la Plataforma está reservado a mayores de edad.</p>
      </Section>

      <Section title="3. Suscripciones, Créditos y Pagos">
        <p>
          El acceso a las clases se realiza mediante planes de suscripción mensual (Starter,
          Balance, Volumen u otros que UNIQUE defina), cada uno con una asignación de créditos que
          el Usuario puede redimir en reservas dentro de la vigencia del plan. Los créditos no
          utilizados no son acumulables entre periodos, no son reembolsables, ni transferibles a
          otro Usuario, salvo que UNIQUE indique expresamente lo contrario para un plan o
          promoción determinada. Lo anterior se entiende sin perjuicio de los casos en que la ley
          aplicable exija devolución o restitución.
        </p>
        <p>
          El Usuario podrá adquirir paquetes adicionales de créditos (&quot;top-ups&quot;)
          únicamente si mantiene una suscripción activa, en las condiciones y precios publicados
          en la Plataforma en el momento de la compra.
        </p>
        <p>
          Los pagos se procesan a través de la pasarela de pagos Wompi u otra que UNIQUE
          determine. UNIQUE no almacena datos completos de tarjetas u otros instrumentos de pago;
          dicha información es tratada directamente por el proveedor de la pasarela de pagos bajo
          sus propias políticas.
        </p>
        <p>
          UNIQUE se reserva el derecho de modificar precios, planes y equivalencias de créditos,
          dando aviso previo al Usuario a través de la Plataforma o por correo electrónico, con
          una antelación razonable que en ningún caso será inferior a diez (10) días calendario
          antes de que el cambio surta efectos frente a suscripciones vigentes. Las modificaciones
          serán prospectivas y no afectarán reservas ya confirmadas. El Usuario podrá cancelar su
          suscripción antes de la entrada en vigor del cambio.
        </p>
      </Section>

      <Section title='4. Reservas, Cancelaciones y Política de "No-Show"'>
        <p>
          El Usuario podrá reservar clases disponibles publicadas por los Gimnasios, sujeto al
          cupo ofrecido por cada Aliado. La reserva se entiende confirmada cuando la Plataforma
          así lo notifica al Usuario.
        </p>
        <p>
          El Usuario podrá cancelar una reserva sin penalidad hasta veinticuatro (24) horas antes
          del inicio de la clase. Las cancelaciones realizadas con menos de veinticuatro (24)
          horas de antelación, así como la inasistencia sin cancelación (&quot;no-show&quot;),
          causarán la pérdida de los créditos utilizados para dicha reserva, sin lugar a
          devolución ni reembolso. Esta consecuencia no aplicará cuando la cancelación o
          inasistencia sea atribuible al Gimnasio, a UNIQUE, a una falla de la Plataforma o a un
          evento que, conforme a la ley, deba dar lugar a devolución o restitución.
        </p>
        <p>
          UNIQUE podrá, a su discreción, establecer límites al número de reservas simultáneas o de
          &quot;no-shows&quot; permitidos por Usuario, así como suspender temporalmente el derecho
          de reserva de Usuarios reincidentes en incumplir esta política. Estos límites o medidas
          deberán ser razonables, proporcionales y previamente informados al Usuario.
        </p>
      </Section>

      <Section title="5. Exclusión de Responsabilidad y Asunción de Riesgo">
        <p>
          El Usuario reconoce y acepta que la práctica de actividad física conlleva riesgos
          inherentes de lesión, y que participa en las clases y actividades ofrecidas por los
          Gimnasios bajo su propia cuenta y riesgo, luego de haber evaluado su condición física y
          de salud para dicha práctica. Se recomienda al Usuario consultar con un profesional de
          la salud antes de iniciar cualquier actividad física, especialmente si tiene condiciones
          médicas preexistentes.
        </p>
        <p>
          UNIQUE NO es responsable por hechos que no le sean legalmente imputables relacionados
          con lesiones, accidentes, daños a la salud, hurtos, pérdidas o daños de bienes
          personales, ni por cualquier perjuicio que el Usuario sufra dentro de las instalaciones
          de un Gimnasio o como consecuencia de una clase, entrenamiento o actividad allí
          desarrollada. La responsabilidad por la seguridad del Usuario dentro de las
          instalaciones, la idoneidad de sus instructores, el estado de sus equipos y el
          cumplimiento de normas de seguridad e higiene corresponde exclusiva y directamente al
          Gimnasio respectivo, conforme a lo pactado en el contrato de vinculación entre UNIQUE y
          cada Gimnasio. Ninguna disposición de estos Términos excluye responsabilidades
          legalmente irrenunciables.
        </p>
        <p>
          UNIQUE tampoco será responsable por la cancelación, modificación de horario, cierre
          temporal o definitivo de un Gimnasio, ni por la calidad del servicio prestado por este,
          sin perjuicio de las gestiones comerciales razonables que UNIQUE pueda adelantar frente
          al Aliado en beneficio del Usuario. Cuando la cancelación o modificación afecte una
          reserva confirmada, UNIQUE restituirá los créditos utilizados o gestionará una
          alternativa equivalente, según corresponda.
        </p>
        <p>
          En la máxima medida permitida por la ley aplicable, la responsabilidad total de UNIQUE
          frente al Usuario por cualquier reclamación relacionada con la Plataforma se limitará al
          valor efectivamente pagado por el Usuario a UNIQUE durante el mes calendario en que
          ocurrieron los hechos que originan la reclamación. Esta limitación no aplicará cuando
          resulte prohibida por normas imperativas, ni respecto de daños causados por dolo o culpa
          grave de UNIQUE, afectaciones a la vida o integridad, incumplimiento de obligaciones
          legales de UNIQUE o derechos irrenunciables del consumidor.
        </p>
      </Section>

      <Section title="6. Indemnidad">
        <p>
          El Usuario se obliga a mantener indemne y a defender a UNIQUE, sus administradores,
          empleados y aliados frente a cualquier reclamación, demanda, sanción, costo o gasto
          (incluidos honorarios de abogados) que surja de: (i) el incumplimiento de estos Términos
          por parte del Usuario; (ii) el uso indebido de la Plataforma; o (iii) hechos o lesiones
          ocurridos en las instalaciones de un Gimnasio derivados de la conducta del propio
          Usuario. Esta obligación procederá únicamente respecto de perjuicios directos,
          comprobados y legalmente imputables al Usuario, y no comprenderá sanciones, costos o
          gastos atribuibles a actos u omisiones de UNIQUE o de terceros.
        </p>
      </Section>

      <Section title="7. Relación con los Gimnasios Aliados">
        <p>
          Los Gimnasios son terceros independientes que ofrecen cupos disponibles a través de la
          Plataforma en virtud de un acuerdo comercial con UNIQUE. Ningún Gimnasio actúa como
          dependiente, agente, representante o empleado de UNIQUE, ni viceversa.
        </p>
        <p>
          UNIQUE se reserva el derecho de incorporar o retirar Gimnasios de la Plataforma en
          cualquier momento, sin que ello genere obligación de compensación frente al Usuario, sin
          perjuicio de honrar las reservas ya confirmadas. Si una reserva confirmada no puede ser
          atendida, se restituirán los créditos utilizados o se ofrecerá una alternativa
          equivalente.
        </p>
      </Section>

      <Section title="8. Propiedad Intelectual">
        <p>
          Todos los derechos de propiedad intelectual sobre la Plataforma, su software, marca,
          nombre comercial &quot;UNIQUE&quot;, diseño, contenidos, base de datos y demás
          elementos, pertenecen a UNIQUE APP S.A.S. o a sus licenciantes. Queda prohibida su
          reproducción, distribución, modificación o explotación no autorizada.
        </p>
        <p>
          El Usuario otorga a UNIQUE una licencia limitada, no exclusiva y gratuita para usar el
          contenido que este publique en la Plataforma (reseñas, calificaciones, fotografías de
          perfil) exclusivamente para el funcionamiento y promoción del servicio. Cuando dicho
          contenido incluya datos personales, imagen o información sensible, su uso promocional
          requerirá la autorización específica que corresponda y respetará las finalidades
          informadas.
        </p>
      </Section>

      <Section title="9. Conducta del Usuario">
        <p>
          El Usuario se compromete a hacer un uso adecuado de la Plataforma y de las instalaciones
          de los Gimnasios, absteniéndose de: suministrar información falsa; compartir su cuenta
          con terceros; reservar cupos con la intención de no asistir de forma reiterada; realizar
          ingeniería inversa sobre la Plataforma; o incurrir en conductas fraudulentas, abusivas,
          discriminatorias o contrarias a la ley.
        </p>
        <p>
          El incumplimiento de esta cláusula faculta a UNIQUE para suspender o cancelar la cuenta
          del Usuario de forma inmediata y sin necesidad de reembolso alguno. La medida deberá ser
          razonable y proporcional, sin perjuicio de las devoluciones o remedios exigidos por
          normas imperativas.
        </p>
      </Section>

      <Section title="10. Modificaciones a los Términos">
        <p>
          UNIQUE podrá modificar estos Términos en cualquier momento. Los cambios serán informados
          a través de la Plataforma o por correo electrónico, y se entenderán aceptados por el
          Usuario si continúa usando la Plataforma después de la fecha de entrada en vigencia del
          cambio. Si el Usuario no está de acuerdo con las modificaciones, podrá cancelar su
          cuenta antes de que estas entren en vigor. Los cambios sustanciales no tendrán efectos
          retroactivos y serán informados con antelación razonable. Cuando afecten la autorización
          para el tratamiento de datos personales, se solicitará una nueva autorización en los
          casos exigidos por la ley.
        </p>
      </Section>

      <Section title="11. Terminación">
        <p>
          El Usuario podrá cancelar su suscripción en cualquier momento a través de la Plataforma,
          surtiendo efecto al finalizar el periodo de facturación en curso, sin lugar a devolución
          proporcional de valores ya pagados. Lo anterior se entiende sin perjuicio de los casos
          en que proceda devolución, retracto, reversión del pago u otro remedio por mandato
          legal.
        </p>
        <p>
          UNIQUE podrá suspender o terminar unilateralmente el acceso de un Usuario a la
          Plataforma, con o sin previo aviso, en caso de incumplimiento de estos Términos, fraude,
          o uso indebido del servicio. La medida será razonable y proporcional; se dará aviso
          cuando la naturaleza del caso lo permita.
        </p>
      </Section>

      <Section title="12. Fuerza Mayor">
        <p>
          UNIQUE no será responsable por el incumplimiento o retraso en la prestación del servicio
          derivado de hechos constitutivos de fuerza mayor o caso fortuito, incluyendo fallas de
          conectividad, fallas de proveedores tecnológicos externos, medidas gubernamentales,
          desastres naturales o situaciones de orden público. Superado el evento, UNIQUE realizará
          las gestiones razonables para restablecer el servicio y aplicará los remedios que
          resulten obligatorios.
        </p>
      </Section>

      <Section title="13. Ley Aplicable y Resolución de Conflictos">
        <p>
          Estos Términos se rigen por las leyes de la República de Colombia. Cualquier
          controversia derivada de estos Términos se someterá, en primer lugar, a una etapa de
          arreglo directo entre las partes; de no lograrse acuerdo, a los mecanismos de
          conciliación extrajudicial disponibles en Bogotá D.C., y en su defecto, a la
          jurisdicción ordinaria de los jueces y tribunales de Bogotá D.C., sin perjuicio del
          fuero y de los demás derechos irrenunciables del consumidor.
        </p>
      </Section>

      <Section title="14. Disposiciones Generales">
        <p>
          Si alguna disposición de estos Términos fuere declarada inválida o inejecutable, las
          demás disposiciones continuarán vigentes. La falta de ejercicio de un derecho por parte
          de UNIQUE no constituye renuncia al mismo. Estos Términos, junto con la Política de
          Tratamiento de Datos Personales, constituyen el acuerdo íntegro entre las partes. Las
          peticiones, quejas o reclamos relacionados con la Plataforma podrán presentarse a través
          de{" "}
          <a href="mailto:uniqueappcol@gmail.com" className="text-move-coral underline">
            uniqueappcol@gmail.com
          </a>
          .
        </p>
      </Section>
    </section>
  );
}
