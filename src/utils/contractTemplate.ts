import type { AppSettings, Employee } from '../types';
import { JOB_POSITIONS } from '../types';
import { calcAge, cantidadEnLetra } from './helpers';
import { escapeHtml, printHtmlDocument } from './printDoc';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTRATO INDIVIDUAL DE TRABAJO — v2.4 (Requerimiento 6)
// Plantilla basada en el contrato real de la empresa (tiempo determinado /
// temporada). Se AUTOLLENA con la informacion capturada en la contratacion y
// el texto resultante es EDITABLE por RH antes de imprimir. Los datos que el
// sistema no captura quedan con lineas ______ para completarse a mano o
// editando el texto.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BLANK = '____________________';

function fechaLarga(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(`${dateStr}T12:00:00`) : dateStr;
  if (Number.isNaN(d.getTime())) return BLANK;
  return d
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

function diasNaturales(inicio: string, fin: string): number {
  const a = new Date(`${inicio}T12:00:00`).getTime();
  const b = new Date(`${fin}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

// v2.14: el domicilio del trabajador se arma con la direccion del expediente;
// si no hay nada capturado, queda la linea en blanco para llenarla a mano.
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
  const empresa = (settings.companyName || 'JABONES Y AMENIDADES DE CALIDAD, S.A. DE C.V.').toUpperCase();
  const rfcEmpresa = (settings.companyRfc || 'JAC140710A85').toUpperCase();
  const domicilio = (settings.companyAddress || 'GIACOMO MEYERBER No. 93, COLONIA VALLEJO, CIUDAD DE MEXICO').toUpperCase();
  const representante = (settings.directorName || 'REPRESENTANTE LEGAL').toUpperCase();

  const trabajador = employee.fullName.toUpperCase();
  const puesto = (JOB_POSITIONS[employee.position]?.name ?? String(employee.position)).toUpperCase();
  const jefe = (employee.supervisor || JOB_POSITIONS[employee.position]?.reportsTo || BLANK).toUpperCase();
  const area = (employee.area || BLANK).toUpperCase();
  const horario = (employee.schedule || BLANK).toUpperCase();
  const rfcTrabajador = (employee.rfc || BLANK).toUpperCase();
  const nss = employee.imssNumber || BLANK;

  // v2.14: el resto de las declaraciones sale del expediente (Datos personales,
  // Direccion e Informacion laboral) — antes iban en blanco y RH las escribia a
  // mano aunque ya estuvieran capturadas.
  const exp = employee.expediente ?? {};
  const edadCalculada = calcAge(exp.fechaNacimiento);
  const edad = edadCalculada !== null ? String(edadCalculada) : BLANK;
  const estadoCivil = (exp.estadoCivil || BLANK).toUpperCase();
  const curp = (exp.curp || BLANK).toUpperCase();
  const domicilio_trabajador = domicilioTrabajador(employee);

  const semanal = employee.salary || 0;
  const diario = employee.dailySalary ?? (semanal > 0 ? Math.round((semanal / 7) * 100) / 100 : 0);
  const salarioTexto = semanal > 0
    ? `$${semanal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${cantidadEnLetra(semanal)}) POR SEMANA`
    : `$${BLANK} (${BLANK}) POR SEMANA`;
  const diarioTexto = diario > 0
    ? `$${diario.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${cantidadEnLetra(diario)}) DIARIOS`
    : `$${BLANK} DIARIOS`;

  const esDeterminado = employee.contractType === 'eventual';
  const inicio = fechaLarga(employee.hireDate);
  // El fin de contrato capturado en Informacion laboral manda sobre el fin del
  // periodo de prueba calculado.
  const finContrato = exp.finContrato || employee.trialEndDate;
  const fin = esDeterminado && finContrato ? fechaLarga(finContrato) : '';
  const dias = esDeterminado && finContrato ? diasNaturales(employee.hireDate, finContrato) : 0;
  const hoy = fechaLarga(new Date());

  const tipoTitulo = esDeterminado ? 'POR TIEMPO DETERMINADO' : 'POR TIEMPO INDETERMINADO';

  const clausulaPrimera = esDeterminado
    ? `PRIMERA. TIPO DE CONTRATO Y CAUSA DE TEMPORALIDAD. El presente contrato se celebra POR TIEMPO DETERMINADO, debido a la necesidad temporal de la operacion (periodo de prueba / incremento de trabajo), conforme a la Ley Federal del Trabajo (LFT). Las partes reconocen que dicha necesidad es temporal y no permanente.`
    : `PRIMERA. TIPO DE CONTRATO. El presente contrato se celebra POR TIEMPO INDETERMINADO, conforme a la Ley Federal del Trabajo (LFT).`;

  const clausulaSegunda = esDeterminado
    ? `SEGUNDA. VIGENCIA. El presente contrato inicia su vigencia el dia ${inicio} y concluira el dia ${fin}${dias > 0 ? ` (${dias} DIAS NATURALES)` : ''}, sin necesidad de aviso al llegar el vencimiento. Cualquier prorroga o nueva contratacion debera constar por escrito y sujetarse a la LFT.`
    : `SEGUNDA. VIGENCIA. El presente contrato inicia su vigencia el dia ${inicio} y se celebra por tiempo indeterminado, conforme a la LFT.`;

  return `CONTRATO INDIVIDUAL DE TRABAJO
${tipoTitulo}

En la Ciudad de Mexico, a ${hoy}, comparecen por una parte la empresa "${empresa}", con RFC ${rfcEmpresa}, con domicilio en ${domicilio}, representada por el C. ${representante}, a quien en lo sucesivo se le denominara "EL PATRON"; y por la otra el/la C. ${trabajador}, por su propio derecho, a quien en lo sucesivo se le denominara "EL TRABAJADOR"; quienes acuerdan celebrar el presente contrato al amparo de la Ley Federal del Trabajo (LFT), conforme a las siguientes:

D E C L A R A C I O N E S

I. DECLARA EL PATRON:

Que ${empresa} es una empresa legalmente constituida conforme a las leyes mexicanas y cuenta con capacidad para celebrar el presente contrato. Que su actividad preponderante incluye la compra-venta y fabricacion de articulos de limpieza y promocionales, entre otros. Que cuenta con Reglamento Interior de Trabajo (RIT) y politicas internas aplicables, mismas que se daran a conocer a EL TRABAJADOR, recabando el acuse correspondiente.

II. DECLARA EL TRABAJADOR:

Que es de nacionalidad ${BLANK}, de ${edad} anos de edad, estado civil ${estadoCivil}, con domicilio en ${domicilio_trabajador}.

Que su RFC es ${rfcTrabajador}, su CURP es ${curp}, y su Numero de Seguridad Social (NSS) es ${nss}.

Que cuenta con la capacidad y aptitudes necesarias para desempenar el puesto y que acepta prestar sus servicios personales subordinados en los terminos del presente contrato. Que proporciona sus datos personales para fines laborales, administrativos, fiscales y de seguridad social, conforme al aviso de privacidad que se le entregue.

C L A U S U L A S

${clausulaPrimera}

${clausulaSegunda}

TERCERA. PUESTO Y OBJETO DEL TRABAJO. EL TRABAJADOR prestara sus servicios en el puesto de ${puesto}, en el area de ${area}, en el centro de trabajo ubicado en ${domicilio} o en areas relacionadas dentro del mismo centro, cuando sea necesario, sin cambio de residencia. Reportara directamente a: ${jefe}. EL TRABAJADOR acepta realizar actividades compatibles o conexas con el puesto, siempre que sean licitas y razonables.

CUARTA. JORNADA, HORARIO Y DESCANSO PARA ALIMENTOS. La jornada sera DIURNA y el horario asignado sera: ${horario}. EL TRABAJADOR tendra un descanso para alimentos de 60 minutos, que se considera tiempo de descanso y no integra la jornada, siempre que EL TRABAJADOR pueda disponer libremente de dicho tiempo conforme a la operacion. El dia de descanso semanal sera DOMINGO, conforme a la LFT y al rol interno.

QUINTA. SALARIO, PERIODICIDAD Y FORMA DE PAGO. EL PATRON pagara a EL TRABAJADOR un salario de ${salarioTexto}, equivalente a ${diarioTexto}, con periodicidad SEMANAL. El pago se realizara mediante TRANSFERENCIA electronica a la cuenta bancaria indicada por EL TRABAJADOR, entregandose el comprobante de nomina correspondiente (CFDI) y/o recibo.

SEXTA. IMSS Y RETENCIONES LEGALES. EL PATRON inscribira a EL TRABAJADOR ante el Instituto Mexicano del Seguro Social (IMSS) conforme a la ley, y efectuara las retenciones y enteros legales que correspondan (impuestos, cuotas y demas). EL TRABAJADOR se obliga a proporcionar la informacion y documentacion necesaria para dichos tramites.

SEPTIMA. PRESTACIONES. EL TRABAJADOR gozara de las prestaciones minimas de ley aplicables (vacaciones y prima vacacional conforme a la LFT, aguinaldo minimo legal, dias de descanso, y demas que resulten procedentes). No existen prestaciones superiores a las de ley salvo pacto expreso por escrito.

OCTAVA. HORAS EXTRAORDINARIAS. Las horas extraordinarias deberan ser previamente autorizadas por EL PATRON y se registraran conforme a los controles internos. En caso de laborarse tiempo extraordinario autorizado, se pagara conforme a los limites y tarifas previstos en la LFT.

NOVENA. DIAS DE DESCANSO OBLIGATORIO. Seran dias de descanso obligatorio los senalados por la LFT y las disposiciones oficiales vigentes. Si por necesidades del servicio EL TRABAJADOR labora un dia de descanso obligatorio, se pagara conforme a la LFT.

DECIMA. SEGURIDAD E HIGIENE, BUENAS PRACTICAS Y DISCIPLINA. EL TRABAJADOR se obliga a cumplir medidas de seguridad e higiene, uso de equipo de proteccion personal cuando corresponda, Buenas Practicas de Manufactura (BPM), procedimientos, senalizacion y disposiciones internas aplicables. El incumplimiento podra ser sancionado conforme a la LFT, el Reglamento Interior de Trabajo (RIT) y politicas internas debidamente notificadas.

DECIMA PRIMERA. REGLAMENTO INTERIOR DE TRABAJO Y POLITICAS INTERNAS. EL TRABAJADOR se obliga a cumplir el Reglamento Interior de Trabajo (RIT) y politicas internas que EL PATRON comunique por escrito o por medios internos, recabandose el acuse de recibido correspondiente.

DECIMA SEGUNDA. CONFIDENCIALIDAD. EL TRABAJADOR se obliga a guardar estricta confidencialidad respecto de toda informacion de EL PATRON y/o de sus clientes, incluyendo sin limitar: procesos, formulas, especificaciones, costos, listas de precios, proveedores, clientes, manuales, procedimientos, documentos, bases de datos y cualquier informacion no publica ("Informacion Confidencial"). Esta obligacion subsistira durante la relacion laboral y hasta 5 anos posteriores a su terminacion, sin perjuicio de las acciones legales que procedan por revelacion o uso indebido.

DECIMA TERCERA. VIDEOVIGILANCIA. EL TRABAJADOR reconoce que en el centro de trabajo existen camaras de videovigilancia interiores y exteriores, utilizadas para seguridad patrimonial, prevencion de riesgos, control de accesos y monitoreo de procesos. Las grabaciones podran utilizarse como evidencia en investigaciones internas y/o ante autoridad competente, conforme a la normativa aplicable y respetando los derechos de las personas.

DECIMA CUARTA. TERMINACION. ${esDeterminado ? 'Al concluir el plazo senalado en la clausula segunda, el presente contrato terminara por vencimiento del termino pactado, conforme a la LFT. EL PATRON cubrira lo que legalmente proceda (finiquito: partes proporcionales) y EL TRABAJADOR devolvera herramientas, equipo, documentos y cualquier Informacion Confidencial en su poder.' : 'La relacion laboral podra terminar por las causas previstas en la LFT. A la terminacion, EL PATRON cubrira lo que legalmente proceda y EL TRABAJADOR devolvera herramientas, equipo, documentos y cualquier Informacion Confidencial en su poder.'}

DECIMA QUINTA. DEDUCCIONES. EL PATRON podra efectuar retenciones y deducciones permitidas por la LFT y demas disposiciones aplicables, incluyendo impuestos, cuotas de seguridad social, pensiones alimenticias y mandatos de autoridad competente.

DECIMA SEXTA. JURISDICCION. Para la interpretacion, cumplimiento y ejecucion del presente contrato, las partes se someten a la Ley Federal del Trabajo (LFT) y, en caso de controversia, a los TRIBUNALES LABORALES COMPETENTES DE LA CIUDAD DE MEXICO, sin perjuicio de la etapa conciliatoria previa ante la autoridad competente, renunciando a cualquier otro fuero que pudiera corresponderles por razon de sus domicilios presentes o futuros.

Leido que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en la Ciudad de Mexico a ${hoy}.


_______________________________
EL PATRON
${empresa}
REPRESENTANTE: ${representante}
FECHA: ${hoy}


_______________________________
EL TRABAJADOR
NOMBRE: ${trabajador}
FECHA: ${hoy}


TESTIGO 1: NOMBRE: ${BLANK}   FIRMA: ${BLANK}

TESTIGO 2: NOMBRE: ${BLANK}   FIRMA: ${BLANK}`;
}

/** Imprime el texto (editable) del contrato via iframe oculto (sin popups). */
export function printContractText(text: string, companyName: string): void {
  const bloques = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  printHtmlDocument(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato Individual de Trabajo</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; margin: 56px; color: #111; }
    .empresa { text-align: center; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #444; margin-bottom: 18px; }
    p { font-size: 12.5px; line-height: 1.7; text-align: justify; margin: 10px 0; white-space: pre-wrap; }
  </style></head><body>
    <div class="empresa">${escapeHtml(companyName)}</div>
    ${bloques}
  </body></html>`);
}
