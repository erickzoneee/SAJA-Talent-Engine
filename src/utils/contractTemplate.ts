import type { AppSettings, Employee } from '../types';
import { JOB_POSITIONS } from '../types';
import { calcAge, cantidadEnLetra } from './helpers';
import { escapeHtml, printHtmlDocument } from './printDoc';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTRATO INDIVIDUAL DE TRABAJO — v2.16
// Dos formatos oficiales de la empresa, autollenados con la informacion del
// colaborador capturada en el sistema:
//   • contractType 'eventual'   → CONTRATO POR PERIODO DE PRUEBA (15 dias, art. 39-A LFT)
//   • contractType 'indefinido' → CONTRATO POR TIEMPO INDETERMINADO (arts. 35 y 36 LFT)
// El texto resultante es EDITABLE por RH antes de imprimir (se guarda en
// employee.contractText). Los datos que el sistema no captura quedan con la
// linea ______ para completarse a mano o editando el texto.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BLANK = '____________________';

function fechaLarga(dateStr?: string | Date): string {
  if (!dateStr) return BLANK;
  const d = typeof dateStr === 'string' ? new Date(`${dateStr}T12:00:00`) : dateStr;
  if (Number.isNaN(d.getTime())) return BLANK;
  return d
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

/** Suma dias naturales a una fecha ISO y la devuelve como fecha larga. */
function fechaMasDias(dateStr: string | undefined, days: number): string {
  if (!dateStr) return BLANK;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return BLANK;
  d.setDate(d.getDate() + days);
  return fechaLarga(d);
}

// El domicilio del trabajador se arma con la direccion del expediente; si no hay
// nada capturado, queda la linea en blanco para llenarla a mano.
function domicilioTrabajador(employee: Employee): string {
  const x = employee.expediente ?? {};
  const calle = [x.calle, x.numeroExterior && `No. ${x.numeroExterior}`, x.numeroInterior && `INT. ${x.numeroInterior}`]
    .filter(Boolean)
    .join(' ');
  const partes = [calle, x.colonia, x.codigoPostal && `C.P. ${x.codigoPostal}`, x.municipio || x.ciudad, x.estado]
    .filter((p) => p && String(p).trim() !== '');
  return partes.length ? partes.join(', ').toUpperCase() : BLANK;
}

export function buildContractText(employee: Employee, settings: AppSettings): string {
  // ─── Datos de LA EMPRESA (constantes del formato oficial; se pueden sustituir
  // por los de Configuracion si estan capturados con un valor real) ───
  const empresa = (settings.companyName || 'Jabones y Amenidades de Calidad, S.A. de C.V.').toUpperCase();
  const rfcEmpresa = (settings.companyRfc || 'JAC140710A85').toUpperCase();
  const registroPatronal = 'Y5655524105';
  // El director del formato oficial. Si en Configuracion hay un nombre real
  // (distinto al placeholder "Director General"), ese manda.
  const dn = (settings.directorName || '').trim();
  const director = dn && dn.toLowerCase() !== 'director general' ? dn.toUpperCase() : 'JUAN CARLOS VELÁZQUEZ GONZÁLEZ';

  // ─── Datos de EL TRABAJADOR (autollenado con el expediente) ───
  const exp = employee.expediente ?? {};
  const nombre = (employee.fullName || BLANK).toUpperCase();
  const nacionalidad = (exp.nacionalidad || 'MEXICANA').toUpperCase();
  const edadCalc = calcAge(exp.fechaNacimiento);
  const edad = edadCalc !== null ? String(edadCalc) : BLANK;
  const estadoCivil = (exp.estadoCivil || BLANK).toUpperCase();
  const rfc = (employee.rfc || BLANK).toUpperCase();
  const curp = (exp.curp || BLANK).toUpperCase();
  const direccion = domicilioTrabajador(employee);
  const puesto = (JOB_POSITIONS[employee.position]?.name ?? String(employee.position)).toUpperCase();

  // ─── Salario DIARIO en letra ($X.XX (X PESOS 00/100 M.N.)) ───
  const semanal = employee.salary || 0;
  const diarioRaw = employee.dailySalary ?? (semanal > 0 ? semanal / 7 : 0);
  // Se redondea a centavos para que la cifra ($) y la cantidad en letra SIEMPRE
  // coincidan (toLocaleString sin maximumFractionDigits mostraria hasta 3
  // decimales, pero cantidadEnLetra redondea a 2 → en un contrato la cifra y la
  // letra no pueden discrepar).
  const diario = Math.round(diarioRaw * 100) / 100;
  const salarioTexto = diario > 0
    ? `$${diario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cantidadEnLetra(diario)})`
    : BLANK;

  // ─── Vigencia ───
  const esIndefinido = employee.contractType === 'indefinido';
  const fechaInicio = fechaLarga(employee.hireDate);
  // El periodo de prueba es de 15 dias naturales a partir de la fecha de ingreso
  // (conforme al art. 39-A LFT y al propio texto del contrato).
  const fechaTermino = fechaMasDias(employee.hireDate, 15);
  const fechaContrato = fechaInicio; // el indefinido arranca en la fecha de ingreso

  // ─── Antecedentes (identicos en ambos formatos) ───
  const antecedentes = [
    'Antecedentes',
    `1.- "${empresa}" es una empresa legalmente constituida según las leyes mexicanas, ante la Fe del Notario Público Número 247 del Distrito Federal según obra en el Libro DOSCIENTOS VEINTITRÉS, Instrumento DOCE MIL SESENTA Y CUATRO de fecha 10 de julio de 2014, con domicilio en GIACOMO MEYERBER No. 93, COLONIA VALLEJO, de ésta ciudad, con Registro Federal de Contribuyentes ${rfcEmpresa} y Registro Patronal ante el Instituto Mexicano del Seguro Social ${registroPatronal}, legalmente representada por C. ${director}.`,
    `2.- "EL TRABAJADOR" C. ${nombre} bajo protesta de decir verdad ser de nacionalidad ${nacionalidad}, de ${edad} años de edad, estado civil ${estadoCivil} con Registro Federal de Contribuyentes: ${rfc}, CURP: ${curp} con domicilio en ${direccion}.`,
    `3.- "LA EMPRESA" ${empresa} tiene como objeto social la Compra-Venta, Fabricación de artículos de limpieza y promocionales entre otros.`,
    `4.- "EL TRABAJADOR" C. ${nombre} que tiene la capacidad jurídica para obligarse en los términos de este contrato, así como las aptitudes y facultades necesarias para el desarrollo del trabajo, motivo de este y que, por tanto, se encuentra en buen estado de salud física y mental.`,
    `5.- "LA EMPRESA" ${empresa} requiere de los servicios de personal apto para el desarrollo de sus actividades, y de modo especial para el puesto o funciones de ${puesto}.`,
    `6.- "EL TRABAJADOR" C. ${nombre} es conforme en desempeñar los requerimientos de la empresa y en plasmar las condiciones generales de trabajo sobre las cuales prestará sus servicios personales.`,
    `7.- "EL TRABAJADOR" C. ${nombre} se compromete a actualizar su información personal cuando haga algún cambio de domicilio o cualquier otra información que se relacione con su puesto de trabajo, si no lo notifica por escrito "LA EMPRESA". Subsistirá el que aquí se señala para cualquier notificación posterior.`,
  ];

  // ─── Clausula SEGUNDA (unico texto que cambia entre formatos) ───
  const clausulaSegunda = esIndefinido
    ? `SEGUNDA: El presente contrato se celebra por TIEMPO INDETERMINADO, a partir del día ${fechaContrato}, de conformidad con lo establecido en los artículos 35 y 36 de la Ley Federal del Trabajo. La relación laboral permanecerá vigente hasta en tanto no se actualice alguna de las causas de terminación o rescisión previstas en "LA LEY" o en el presente instrumento.`
    : `SEGUNDA: El presente contrato se celebra por un PERIODO DE PRUEBA DE QUINCE (15) DÍAS NATURALES, a partir del día ${fechaInicio} y con fecha de término el día ${fechaTermino}, de conformidad con lo establecido en el artículo 39-A de la Ley Federal del Trabajo. Durante este periodo, tanto "LA EMPRESA" como "EL TRABAJADOR" podrán verificar si la relación de trabajo resulta conveniente y se cumple lo pactado en el presente instrumento. Al término de este periodo, el contrato concluirá de pleno derecho sin responsabilidad para ninguna de las partes, salvo que exista acuerdo expreso de continuidad.`;

  // ─── Clausula extra del contrato de prueba (evaluacion al termino) ───
  const clausulaEvaluacionPrueba = `DÉCIMA SEGUNDA BIS — EVALUACIÓN AL TÉRMINO DEL PERIODO DE PRUEBA: Al concluir el periodo de prueba de quince (15) días naturales, "LA EMPRESA" realizará una evaluación formal del desempeño de "EL TRABAJADOR" considerando los siguientes criterios: (I) Cumplimiento del horario y puntualidad; (II) Calidad en la ejecución de las tareas asignadas; (III) Actitud, disposición y trabajo en equipo; (IV) Conocimiento y apego a las normas de seguridad e higiene; (V) Adaptación a los procesos y cultura organizacional de "LA EMPRESA". El resultado de dicha evaluación será comunicado por escrito a "EL TRABAJADOR" a más tardar el último día del periodo de prueba. En caso de que "LA EMPRESA" determine que "EL TRABAJADOR" ha cumplido satisfactoriamente con los criterios de evaluación, las partes podrán suscribir un Contrato Individual de Trabajo por Tiempo Indeterminado. En caso contrario, la relación laboral concluirá al término del periodo de prueba sin responsabilidad para ninguna de las partes, en términos del artículo 39-A de la Ley Federal del Trabajo.`;

  // ─── Clausulas comunes ───
  const clausulas = [
    'Cláusulas',
    `PRIMERA: Se denominará en lo sucesivo a ${empresa} como "LA EMPRESA" y a C. ${nombre} como "EL TRABAJADOR"; a la Ley Federal del Trabajo como "LA LEY" al referirse al presente documento como "El CONTRATO" y a los que los suscriben como "LAS PARTES".`,
    clausulaSegunda,
    `TERCERA: "EL TRABAJADOR" se obliga a prestar sus servicios personales de manera subordinada a "LA EMPRESA" bajo la dirección y dependencia de su jefe inmediato superior, para desempeñar el puesto de ${puesto} así como las labores inherentes al mismo con toda intensidad, eficiencia, cuidado y esmero apropiados, según la naturaleza de las funciones encomendadas, las cuales se encuentran contenidas en la agenda de labores formada por "LA EMPRESA" y "EL TRABAJADOR". Queda expresamente convenido que acatará en el desempeño de su trabajo todas las disposiciones del Reglamento Interior de Trabajo, todas los órdenes, circulares y disposiciones que dicte el patrón, y todos los ordenamientos legales que le sean aplicables.`,
    `CUARTA: "EL TRABAJADOR" deberá integrarse a los Planes, Programas y Comisiones Mixtas de Capacitación y Adiestramiento así como a los de Seguridad e Higiene en el Trabajo que tiene constituida "LA EMPRESA" tomando parte activa dentro de los mismos según los cursos establecidos y medidas preventivas de riesgo de trabajo. "EL TRABAJADOR" tendrá las obligaciones y responsabilidades que se señalan en el presente contrato, en forma enunciativa y no limitativa, así como en las labores afines, relacionadas o conexas a su ocupación principal que "LA EMPRESA" le encomiende. En ningún momento "EL TRABAJADOR" podrá alegar desconocimiento de sus obligaciones, tareas, responsabilidades y alcances que conlleva el puesto, manifestando asimismo que conoce y/o tiene los conocimientos suficientes y necesarios para la realización de sus actividades de ${puesto}.`,
    `QUINTA: El lugar de la prestación de los servicios de "EL TRABAJADOR" será el domicilio de la empresa. Asimismo "Las partes" convienen y aceptan que "EL TRABAJADOR" cuando por razones administrativas o de desarrollo de la actividad o prestación de servicios contratados haya necesidad de removerlo, podrá trasladarse al lugar que "LA EMPRESA" le asigne. "LA EMPRESA" le comunicará con anticipación la remoción del lugar de prestación de servicios indicándole el nuevo asignado; para el caso que en el nuevo lugar de prestación de servicios que le fuera asignado variara el horario de labores, "EL TRABAJADOR" acepta allanarse a dicha modalidad.`,
    `SEXTA: El trabajador percibirá, por la prestación de los servicios a que se refiere este contrato, un salario diario de ${salarioTexto} en moneda de curso legal y en las oficinas de "LA EMPRESA", el salario se le cubrirá los SÁBADOS de cada semana laboral vencida, acordando las partes que en caso de que el día de pago sea feriado se le cubrirá el día hábil inmediato anterior a la fecha de pago. Del salario anterior "LA EMPRESA" hará por cuenta de "EL TRABAJADOR" las deducciones legales correspondientes, particularmente las que se refieren al Impuesto sobre la Renta, Seguro Social, cuotas sindicales. Asimismo se harán las aportaciones y altas al IMSS, Infonavit, SAR y Hacienda en los términos de las legislaciones respectivas. "EL TRABAJADOR" deberá cada vez que le sea pagado su salario plasmar su nombre y firma en el recibo correspondiente de nómina y los documentos que "LA EMPRESA" le presente para tales fines.`,
    `SÉPTIMA: La duración de la jornada laboral será de 8 (ocho) horas diarias, de lunes a viernes de 8:30 a 17:30 hrs y los sábados de 8:30 a 14:00 hrs., "El trabajador gozará de una hora diaria para tomar alimentos, misma que no integra la jornada de trabajo, por ser tiempo de descanso y poder disponer libremente de ella." Por lo que constituye una jornada semanaria menor a 48 horas. "EL TRABAJADOR" tiene la obligación de acatar el horario y los mecanismos de registro que la empresa le fije, mismo que será establecido atendiendo a la necesidad operacional de "LA EMPRESA" y sus clientes. "EL TRABAJADOR" deberá presentarse puntualmente a sus labores en el horario de trabajo establecido en el párrafo anterior y registrar su asistencia mediante su huella digital o checar su tarjeta de asistencia en el reloj checador diariamente o en cualquier otro mecanismo que para tal efecto designe "LA EMPRESA", en caso de retraso o falta de asistencia injustificada podrá el patrón imponerle cualquier corrección disciplinaria de las que contempla el reglamento interior de "LA LEY".`,
    `OCTAVA: Únicamente podrá laborar tiempo extraordinario cuando "LA EMPRESA" se lo indique y medie orden por escrito, la que señalará el día o los días y el horario en el cual se desempeñará la misma. Para el caso de computar el tiempo extraordinario laborado deberá "EL TRABAJADOR" recabar y conservar la orden referida a fin de que en su momento quede debidamente pagado el tiempo extra laborado; la falta de presentación de esa orden sólo es imputable a "EL TRABAJADOR". Las partes manifiestan que salvo esta forma queda prohibido en el centro de trabajo laborar horas extras. Lo anterior con apoyo de la tesis de jurisprudencia 16/94 de la Cuarta Sala de la Suprema Corte de Justicia de la Nación.`,
    `NOVENA: Por cada 6 (Seis) días de trabajo, tendrá el trabajador un descanso semanal de un día, con pago de salario íntegro, concibiéndose en que dicho descanso lo disfrutará ordinariamente el Domingo de cada semana. También disfrutará de descanso, con pago de salario íntegro, los días señalados por la "LA LEY", a saber, el 1° de enero, 5 de febrero, 21 de marzo, 1° de Mayo, 16 de septiembre, 20 de noviembre, 25 de diciembre, y el 1° de Diciembre de cada seis años cuando corresponda a la transmisión del Poder Ejecutivo Federal. En consecuencia, cuando algún día de descanso obligatorio cambie de fecha o se recorra conforme a la legislación vigente o disposiciones oficiales, se estará a lo que marque el calendario oficial aplicable en el año correspondiente, sin necesidad de modificar el presente contrato. "EL TRABAJADOR" que preste sus servicios en los días de descanso antes mencionados, sin disfrutar de otros en sustitución, recibirá el pago correspondiente en términos de "LA LEY".`,
    `DÉCIMA: "EL TRABAJADOR" en caso de generarse tendrá derecho a disfrutar de un periodo anual de vacaciones en términos de "LA LEY" tomando en consideración la antigüedad en el trabajo, así como a disfrutar del salario que corresponda. "LA EMPRESA", fijará las fechas en las que disfrutará de vacaciones, de manera que las labores no se vean perjudicadas. De igual modo recibirá la Prima Vacacional respectiva, equivalente al 25% del importe pagado por vacaciones. En caso de faltas injustificadas de asistencia al trabajo, se podrán deducir dichas faltas del periodo de prestación de servicios computables para fijar las vacaciones, reduciéndose éstas proporcionalmente. Las vacaciones no podrán compensarse con una remuneración. Si la relación de trabajo termina antes de que se cumpla el año de servicios, el trabajador tendrá derecho a una remuneración proporcional al tiempo de servicios prestados.`,
    `DÉCIMA PRIMERA: "EL TRABAJADOR" tendrá derecho a recibir por parte de "LA EMPRESA", antes del día 20 de diciembre de cada año, el importe correspondiente a quince días de salario como pago del aguinaldo en términos de "LA LEY", o su parte proporcional por fracción de año.`,
    // La clausula BIS solo existe en el contrato por periodo de prueba.
    ...(esIndefinido ? [] : [clausulaEvaluacionPrueba]),
    `DÉCIMA SEGUNDA: "EL TRABAJADOR" acepta someterse a los reconocimientos médicos que periódicamente establezca "LA EMPRESA" y a poner en práctica las medidas profilácticas de higiene y seguridad que establece "LA LEY" a fin de mantener en forma óptima sus facultades físicas e intelectuales para el desempeño de sus funciones. El médico que practique los reconocimientos será designado y retribuido por "LA EMPRESA".`,
    `DÉCIMA TERCERA: "EL TRABAJADOR" deberá usar y cumplir todo lo contenido en el Reglamento Interior de Trabajo con que cuenta "LA EMPRESA" y que tiene fijado en las áreas de mayor visibilidad.`,
    `DÉCIMA CUARTA: "EL TRABAJADOR" reconoce que son propiedad de "LA EMPRESA" instrumentos, herramientas, aparatos, maquinaria, artículos, manuales de operación, instrumentos de trabajo, instalaciones, equipo de cómputo, acceso a internet, sistemas de comunicación interna y externa, acceso a la red telefónica, automóviles propiedad de "LA EMPRESA" y en general todo equipo y herramientas de trabajo. De igual manera responderá por el uso indebido de las instalaciones tanto eléctricas como telefónicas, aparatos de intercomunicación, de computación, vehículos, sistemas de ventilación, servicios sanitarios y demás servicios, bienes o cualquier otra propiedad de "LA EMPRESA", que utilice con motivo y para la exclusiva prestación de sus servicios, de conformidad con lo que disponen los artículos relativos y aplicables de "LA LEY", y reportará de inmediato a "EL PATRÓN" cualquier descompostura, anomalía o mal uso que observe a este respecto; por lo que por causas imputables a "EL TRABAJADOR" los útiles de trabajo se destruyeran o se perdieran, o la información contenida o registrada en cualquier forma en ellos se destruyera, se perdiera o se difundiera indebidamente, "EL TRABAJADOR" resarcirá a "LA EMPRESA" de los daños que se causen, sin perjuicio de poder aplicar lo dispuesto por las fracciones contenidas en el artículo 47 de "LA LEY" y el Reglamento Interior del Trabajo. Para efectos del párrafo anterior "EL TRABAJADOR" reconoce expresamente que toda la información, en lo sucesivo "INFORMACIÓN CONFIDENCIAL", proporcionada por "LA EMPRESA", incluyendo en forma enunciativa y no limitativa, la información relativa a sus procesos, métodos, servicios, costos, políticas comerciales, clientes, etcétera, es confidencial; en tal virtud, la "INFORMACIÓN CONFIDENCIAL" será considerada como secreto comercial en la forma en que se define y protege dicho término por la Ley de la Propiedad Industrial. "EL TRABAJADOR" se abstendrá de usar o divulgar a terceros la "INFORMACIÓN CONFIDENCIAL". En forma especial, "EL TRABAJADOR" se hace sabedor(a) de las sanciones en que incurren las personas que falsifican firmas, alteran o falsifican documentos o suplantan la personalidad de otro, por lo que, sin responsabilidad alguna para "LA EMPRESA", de realizarse cualquiera de estos supuestos, serán aplicadas las referidas sanciones tanto laborales como penales que correspondan. Si "EL TRABAJADOR" dejare de cumplir las obligaciones a que se refieren los párrafos anteriores, independientemente de su responsabilidad laboral y civil por los daños y perjuicios que causara a "LA EMPRESA", éste último se reserva sus derechos para denunciar el o los delitos que se pudieren configurar.`,
    `DÉCIMA QUINTA: Cualquier modificación que de común acuerdo convengan las partes será consignada en los anexos del presente contrato que al efecto se formulen, formando parte integrante del mismo. Con fundamento en los artículos 134 y 135 de "LA LEY", se conviene que durante la relación de trabajo, como después de la terminación o rescisión de la relación laboral, "EL TRABAJADOR" se obliga en todo momento a no usar en beneficio propio o de terceros y a mantener en reserva absoluta los secretos industriales y/o comerciales, así como los asuntos administrativos tanto de "LA EMPRESA" como de los posibles socios, clientes o proveedores con los que trate, reconociendo que en caso de incumplimiento, se estará a lo dispuesto en el supuesto que corresponda establecidos en el artículo 223 de la Ley de Propiedad Industrial o en el Título Sexto del Código Penal para el Distrito Federal en materia de fuero común y para toda la República en materia del fuero federal que reglamenta los delitos relacionados con los derechos de autor.`,
    `DÉCIMA SEXTA: "EL TRABAJADOR" se obliga a no desempeñar dentro de su jornada laboral, trabajos o labores personales para terceras personas, actos de comisión mercantil, consignación, intermediación o de cualquier especie aun cuando no sean remunerados, para sí o para personas distintas a "LA EMPRESA" ya que su tiempo laboral lo debe destinar al cumplimiento de las labores contratadas.`,
    `DÉCIMA SÉPTIMA: "EL TRABAJADOR" reconoce y conviene expresamente con "LA EMPRESA" que bajo ninguna circunstancia introducirá a su centro de trabajo ni utilizará dentro de sus labores útiles o instrumentos de trabajo no proporcionados por "LA EMPRESA".`,
    `DÉCIMA OCTAVA: "EL TRABAJADOR" cede en forma exclusiva y definitiva a favor de "LA EMPRESA" la titularidad de los Derechos de Autor y de Propiedad Industrial que se generen con motivo de la actividad laboral desarrollada; igualmente "EL TRABAJADOR" cede a favor de "LA EMPRESA" la Propiedad de las Invenciones que realice en el desarrollo de su actividad laboral, independientemente de que haya sido por encargo o no. En caso de que "EL TRABAJADOR" tenga derecho a una compensación complementaria, la misma se fijará en función a lo establecido por "LA LEY". De igual forma "EL TRABAJADOR" reconoce que todos los trabajos desarrollados por él como parte de las responsabilidades que le sean asignadas o de las funciones que desempeña para "LA EMPRESA", durante la vigencia del presente contrato, son propiedad intelectual de "LA EMPRESA", ya se trate de modelos de negocios, sistemas informáticos, invenciones de todo tipo, procedimientos de trabajo, documentos, fórmulas matemáticas o cualquier otro producto de su trabajo, de conformidad con lo establecido en la Ley de Propiedad Industrial.`,
    `DÉCIMA NOVENA: "EL TRABAJADOR" deberá dar fiel cumplimiento a las disposiciones contenidas en "LA LEY" y que corresponden a las obligaciones de los trabajadores en el desempeño de sus labores en "LA EMPRESA". Asimismo "LAS PARTES" convienen en sujetarse a lo previsto en este contrato, ya que el mismo sustituye cualquier acuerdo previo entre las partes, ya sea verbal o por escrito; lo no previsto en este contrato se regirá por las disposiciones contenidas en "La Ley" o del Reglamento Interior de Trabajo.`,
    `VIGÉSIMA: "LAS PARTES" reconocen que con motivo de la celebración de este contrato pueden llegar a intercambiar datos personales según dicho término se define en La Ley Federal de Protección de Datos Personales en posesión de los particulares, como responsables directos o como encargados por cuenta de la parte opuesta, por lo que en virtud de este acto consienten recíprocamente la obtención, divulgación, almacenamiento, manejo y tratamiento en cualquier forma de dichos datos por la parte opuesta, únicamente para los fines y efectos que se deriven de este contrato. "EL TRABAJADOR" manifiesta su conformidad con el aviso de privacidad de "LA EMPRESA", autorizando a la misma la utilización de protección de datos personales bajo las restricciones establecidas en el mencionado aviso.`,
    `VIGÉSIMA PRIMERA: Será causa de rescisión automática del presente contrato que "EL TRABAJADOR" sea asegurado o resguardado por cualquier autoridad derivado de la sospecha o comprobación de la comisión de delitos consumados dentro o fuera de "LA EMPRESA", (hechos típicos y antijurídicos) constitutivos de cualquiera de los delitos de delincuencia organizada, de los cuales se mencionan entre otros de manera enunciativa mas no limitativa los siguientes: narcotráfico, secuestro, robo de vehículo y trata de personas, esto con independencia de que el juez que conozca del asunto penal dicte la sentencia correspondiente. Por qué bajo ese orden de ideas "EL TRABAJADOR" libra a "LA EMPRESA" de toda responsabilidad en la que pudiera verse involucrado, derivado de la comisión de delitos consumados dentro o fuera de "LA EMPRESA". Para acreditarse la buena fe con la que actúan las partes en el presente instrumento "EL TRABAJADOR" declara lo siguiente: A) Que los datos personales que proporcionó para la elaboración del presente instrumento son verdaderos; B) Que a la fecha de firma del presente instrumento, no tiene antecedentes penales, ni ha cometido hechos ilícitos alguno o contrarios a la moral que pudieran dar origen a un procedimiento o denuncia penal. C) Que su forma de ingreso ha sido lícita.`,
    `VIGÉSIMA SEGUNDA: "EL TRABAJADOR" entiende y acepta las causas de rescisión del presente contrato sin responsabilidad de "LA EMPRESA" estipuladas en el art. 47 de "LA LEY" siendo las siguientes: I. ENGAÑAR "EL TRABAJADOR" AL PATRÓN CON CERTIFICADOS FALSOS O REFERENCIAS EN LOS QUE SE ATRIBUYAN AL TRABAJADOR CAPACIDAD, APTITUDES O FACULTADES DE QUE CAREZCA. II. INCURRIR "EL TRABAJADOR", DURANTE SUS LABORES, EN FALTAS DE PROBIDAD U HONRADEZ, EN ACTOS DE VIOLENCIA, AMAGO, INJURIAS O MALOS TRATAMIENTOS EN CONTRA DEL PATRÓN, SUS FAMILIARES O DEL PERSONAL DIRECTIVO O ADMINISTRATIVO DE LA EMPRESA O ESTABLECIMIENTO. III. COMETER "EL TRABAJADOR" CONTRA ALGUNO DE SUS COMPAÑEROS, CUALQUIERA DE LOS ACTOS ENUMERADOS EN LA FRACCIÓN ANTERIOR, SI COMO CONSECUENCIA DE ELLOS SE ALTERA LA DISCIPLINA DEL LUGAR EN QUE SE DESEMPEÑA EL TRABAJO. IV. COMETER "EL TRABAJADOR" FUERA DEL SERVICIO, CONTRA EL PATRÓN, SUS FAMILIARES O PERSONAL DIRECTIVO ADMINISTRATIVO, ALGUNO DE LOS ACTOS A QUE SE REFIERE LA FRACCIÓN II. V. OCASIONAR "EL TRABAJADOR", PERJUICIOS MATERIALES DURANTE EL DESEMPEÑO DE LAS LABORES O CON MOTIVO DE ELLAS, EN LOS EDIFICIOS, OBRAS, MAQUINARIA, INSTRUMENTOS, MATERIAS PRIMAS Y DEMÁS OBJETOS RELACIONADOS CON EL TRABAJO. VI. COMPROMETER "EL TRABAJADOR", POR SU IMPRUDENCIA O DESCUIDO INEXCUSABLE, LA SEGURIDAD DEL ESTABLECIMIENTO O DE LAS PERSONAS QUE SE ENCUENTREN EN ÉL. VII. COMETER "EL TRABAJADOR" ACTOS INMORALES EN EL ESTABLECIMIENTO O LUGAR DE TRABAJO. VIII. REVELAR "EL TRABAJADOR" LOS SECRETOS DE FABRICACIÓN O DAR A CONOCER ASUNTOS DE CARÁCTER RESERVADO, CON PERJUICIO DE LA EMPRESA. IX. TENER "EL TRABAJADOR" MÁS DE TRES FALTAS DE ASISTENCIA EN UN PERÍODO DE TREINTA DÍAS, SIN PERMISO DE "LA EMPRESA" O SIN CAUSA JUSTIFICADA. X. DESOBEDECER "EL TRABAJADOR" AL PATRÓN O A SUS REPRESENTANTES, SIN CAUSA JUSTIFICADA, SIEMPRE QUE SE TRATE DEL TRABAJO CONTRATADO. XI. NEGARSE "EL TRABAJADOR" A ADOPTAR LAS MEDIDAS PREVENTIVAS O A SEGUIR LOS PROCEDIMIENTOS INDICADOS PARA EVITAR ACCIDENTES O ENFERMEDADES. XII. CONCURRIR "EL TRABAJADOR" A SUS LABORES EN ESTADO DE EMBRIAGUEZ O BAJO LA INFLUENCIA DE ALGÚN NARCÓTICO O DROGA ENERVANTE. XIII. LA SENTENCIA EJECUTORIADA QUE IMPONGA A "EL TRABAJADOR" UNA PENA DE PRISIÓN, QUE LE IMPIDA EL CUMPLIMIENTO DE LA RELACIÓN DE TRABAJO. XIV. LAS ANÁLOGAS A LAS ESTABLECIDAS EN LAS FRACCIONES ANTERIORES, DE IGUAL MANERA GRAVES Y DE CONSECUENCIAS SEMEJANTES EN LO QUE AL TRABAJO SE REFIERE.`,
    `VIGÉSIMA TERCERA: "LAS PARTES" convienen en que para la interpretación y cumplimiento de este documento se sujetarán a la jurisdicción de la Junta Local de Conciliación y Arbitraje.`,
  ];

  const titulo = esIndefinido
    ? 'CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO'
    : 'CONTRATO INDIVIDUAL DE TRABAJO POR PERIODO DE PRUEBA';

  const intro = `CONTRATO INDIVIDUAL DE TRABAJO que celebra por una parte la empresa ${empresa}, representada por el C. ${director}, y por la otra el C. ${nombre} por su propio derecho, al tenor de los siguientes:`;

  const fechaCierre = esIndefinido ? fechaContrato : fechaInicio;
  const cierre = `Leído que fue por las partes el presente Contrato Individual de Trabajo y una vez enterada de su contenido, obligaciones y alcance, lo firman de común acuerdo por duplicado en la Ciudad de México, Distrito Federal, a ${fechaCierre}.`;

  // Las firmas van en DOS bloques de nivel superior (separados por linea en
  // blanco) para que la impresion los mantenga como firmas centradas: NUNCA
  // meter una linea vacia DENTRO de un bloque, porque el split por \n\n de la
  // impresion lo partiria y la segunda mitad caeria como parrafo normal.
  const firmaEmpresa = [
    '"LA EMPRESA"',
    '_______________________________________',
    director,
    'Director General',
    empresa,
  ].join('\n');
  const firmaTrabajador = [
    '"EL TRABAJADOR"',
    '_______________________________________',
    nombre,
    'Trabajador(a)',
  ].join('\n');

  return [
    titulo,
    intro,
    ...antecedentes,
    ...clausulas,
    cierre,
    firmaEmpresa,
    firmaTrabajador,
  ].join('\n\n');
}

// ─── Impresion (sin popups, via iframe oculto) ─────────────────────────────

const HEADERS = new Set(['antecedentes', 'cláusulas', 'clausulas']);

function renderBloque(p: string): string {
  const plano = p.trim();
  const key = plano.toLowerCase();

  // Titulo del contrato → centrado y en negrita
  if (/^contrato individual de trabajo por /i.test(plano)) {
    return `<h1>${escapeHtml(plano)}</h1>`;
  }
  // Encabezados de seccion (Antecedentes / Clausulas) → centrado en negrita
  if (HEADERS.has(key)) {
    return `<h2>${escapeHtml(plano)}</h2>`;
  }
  // Bloques de firma ("LA EMPRESA" / "EL TRABAJADOR") → centrado, respetando
  // saltos de linea.
  if (plano.startsWith('"LA EMPRESA"') || plano.startsWith('"EL TRABAJADOR"')) {
    return `<div class="firmas">${escapeHtml(plano).replace(/\n/g, '<br/>')}</div>`;
  }
  // Parrafo normal: se pone en negrita el rotulo inicial ("PRIMERA:", "1.-", etc.)
  let html = escapeHtml(plano).replace(/\n/g, '<br/>');
  html = html.replace(/^([A-ZÁÉÍÓÚÑÜ0-9()°.\s—-]{2,70}?:)/, '<strong>$1</strong>');
  html = html.replace(/^(\d+\.-)/, '<strong>$1</strong>');
  return `<p>${html}</p>`;
}

/** Imprime el texto (editable) del contrato via iframe oculto (sin popups). */
export function printContractText(text: string, companyName: string): void {
  const bloques = text.split(/\n{2,}/).map(renderBloque).join('');
  printHtmlDocument(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato Individual de Trabajo</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; margin: 48px; color: #111; }
    .empresa { text-align: center; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
    h1 { text-align: center; font-size: 15px; text-transform: uppercase; margin: 4px 0 18px; }
    h2 { text-align: center; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin: 22px 0 10px; }
    p { font-size: 12px; line-height: 1.7; text-align: justify; margin: 9px 0; white-space: pre-wrap; }
    .firmas { text-align: center; font-size: 12px; line-height: 1.9; margin-top: 40px; white-space: pre-wrap; }
    strong { font-weight: bold; }
  </style></head><body>
    <div class="empresa">${escapeHtml(companyName)}</div>
    ${bloques}
  </body></html>`);
}
