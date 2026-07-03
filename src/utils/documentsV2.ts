import type { AppSettings, Employee, SignedDocKey, SignedDocsV2 } from '../types';
import { JOB_POSITIONS } from '../types';
import { formatDate } from './helpers';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOCUMENTOS OBLIGATORIOS v2.0 — BRD Junio 2026
// Regla de oro: el colaborador firma SOLO 5 documentos fisicos en papel.
// Todo lo demas se cubre con video + confirmacion digital en tablet.
// Autollenados con variables del expediente.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DocTemplate {
  key: SignedDocKey;
  titulo: string;
  cuando: string;
  tantos: string;
  descripcion: string;
  parrafos: string[];
  firmaIzquierda: string;
  firmaDerecha: string;
}

export function createEmptySignedDocs(): SignedDocsV2 {
  const empty = { generado: false };
  return {
    contrato: { ...empty },
    acuseGeneral: { ...empty },
    avisoISR: { ...empty },
    convenioVacaciones: { ...empty },
    cartaUniforme: { ...empty },
  };
}

export const DOC_ORDER: SignedDocKey[] = ['contrato', 'acuseGeneral', 'avisoISR', 'convenioVacaciones', 'cartaUniforme'];

export function buildDocuments(employee: Employee, settings: AppSettings): DocTemplate[] {
  const empresa = settings.companyName;
  const nombre = employee.fullName;
  const puesto = JOB_POSITIONS[employee.position]?.name ?? employee.position;
  const sueldo = employee.salary ? `$${employee.salary.toLocaleString('es-MX')} semanales` : '$__________ semanales';
  const horario = employee.schedule || 'Horario establecido por la empresa';
  const jefe = employee.supervisor || JOB_POSITIONS[employee.position]?.reportsTo || 'Jefe directo de area';
  const fechaIngreso = formatDate(employee.hireDate);

  return [
    {
      key: 'contrato',
      titulo: 'Contrato Individual de Trabajo',
      cuando: 'Dia 1',
      tantos: '2 tantos',
      descripcion: 'Autollenado con los datos capturados (empresa, trabajador, puesto, sueldo diario/semanal, horario, vigencia) y EDITABLE antes de imprimir.',
      parrafos: [
        `Contrato individual de trabajo por periodo de prueba que celebran, por una parte, ${empresa}, con domicilio en ${settings.companyAddress}${settings.companyRfc ? ` y RFC ${settings.companyRfc}` : ''}, en adelante "LA EMPRESA", y por otra parte ${nombre}, en adelante "EL TRABAJADOR".`,
        `PUESTO: EL TRABAJADOR prestara sus servicios en el puesto de ${puesto}, reportando directamente a ${jefe}.`,
        `DURACION: el presente contrato es por un PERIODO DE PRUEBA DE 15 DIAS contados a partir del ${fechaIngreso}, conforme al articulo 39-A de la Ley Federal del Trabajo. Al termino del periodo, LA EMPRESA evaluara el desempeno de EL TRABAJADOR (evaluaciones de dia 15 y dia 30) para decidir la continuidad de la relacion laboral.`,
        `SALARIO: EL TRABAJADOR percibira un salario de ${sueldo}, pagadero cada sabado.`,
        `HORARIO: la jornada de trabajo sera: ${horario}.`,
        'OBLIGACIONES: EL TRABAJADOR se compromete a cumplir el Reglamento Interior de Trabajo, las Buenas Practicas de Manufactura (BPM), las politicas internas de la empresa y las instrucciones de su jefe directo, asi como a cuidar el equipo, herramienta y uniforme que se le proporcione.',
        'Leido el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado, quedando un tanto en poder de cada parte.',
      ],
      firmaIzquierda: `${nombre} — Trabajador`,
      firmaDerecha: `${settings.directorName} — ${empresa}`,
    },
    {
      key: 'acuseGeneral',
      titulo: 'Acuse General de Recepcion',
      cuando: 'Dia 1',
      tantos: '1 tanto',
      descripcion: 'Reglamento, privacidad, politicas de asistencia / celular / comedor / locker / higiene, confidencialidad, BPM y videovigilancia — todo en UN solo documento.',
      parrafos: [
        `Yo, ${nombre}, colaborador de ${empresa} en el puesto de ${puesto}, declaro que con fecha ${fechaIngreso} recibi, me fueron explicados en voz alta y acepto los siguientes documentos y politicas:`,
        '1. Reglamento Interior de Trabajo.',
        '2. Aviso de privacidad y tratamiento de datos personales.',
        '3. Politica de asistencia, puntualidad y justificacion de faltas.',
        '4. Politica de uso de celular dentro de la planta.',
        '5. Politica de uso de comedor y areas comunes.',
        '6. Politica de uso de locker y resguardo de pertenencias.',
        '7. Politica de higiene personal y Buenas Practicas de Manufactura (BPM).',
        '8. Compromiso de confidencialidad sobre formulas, procesos, clientes e informacion de la empresa.',
        '9. Aviso de videovigilancia: declaro saber que las instalaciones cuentan con camaras de seguridad que graban con fines de seguridad y proteccion de las personas y los bienes de la empresa.',
        'Manifiesto que se me dio oportunidad de preguntar y que entiendo el contenido de cada punto. Este acuse cubre en un solo documento la recepcion de todas las politicas mencionadas.',
      ],
      firmaIzquierda: `${nombre} — Colaborador`,
      firmaDerecha: `Recursos Humanos — ${empresa}`,
    },
    {
      key: 'avisoISR',
      titulo: 'Aviso de Ajuste de ISR',
      cuando: 'Dia 1',
      tantos: '1 tanto',
      descripcion: 'Explica el ISR semanal y por que en meses con 5 semanas puede cambiar el descuento.',
      parrafos: [
        `Yo, ${nombre}, declaro que ${empresa} me explico lo siguiente sobre el Impuesto Sobre la Renta (ISR) que se descuenta de mi pago semanal:`,
        '1. El ISR es un impuesto establecido por la ley; la empresa unicamente lo retiene y lo entrega al SAT.',
        '2. El calculo del ISR se hace conforme a las tablas oficiales vigentes.',
        '3. En los meses que tienen 5 semanas de pago, el descuento de ISR puede variar respecto a los meses de 4 semanas, por la forma en que la ley distribuye el impuesto. Esto puede hacer que en algunas semanas el descuento sea mayor o menor.',
        '4. Esta variacion NO es un descuento adicional de la empresa ni un error de nomina: es el ajuste normal del impuesto.',
        'Firmo de enterado y conforme con esta explicacion.',
      ],
      firmaIzquierda: `${nombre} — Colaborador`,
      firmaDerecha: `Recursos Humanos — ${empresa}`,
    },
    {
      key: 'convenioVacaciones',
      titulo: 'Convenio de Esquema de Vacaciones',
      cuando: 'Dia 1',
      tantos: '1 tanto',
      descripcion: 'Esquema: vacaciones desde el primer ano cumplido, cierre de ultima semana del ano para mantenimiento, dias sobrantes por acuerdo con la empresa.',
      // Texto oficial del BRD v2.0 — seccion 6
      parrafos: [
        `Yo, ${nombre}, en mi calidad de colaborador de Jabones y Amenidades de Calidad, declaro conocer y aceptar el siguiente esquema de vacaciones:`,
        '1. Las vacaciones se generan a partir del primer ano cumplido de trabajo, conforme a la Ley Federal del Trabajo.',
        '2. La empresa cierra sus instalaciones la ultima semana del ano para mantenimiento. Los colaboradores que tengan vacaciones generadas tomaran esos dias como parte de sus vacaciones.',
        '3. Los colaboradores que no tengan vacaciones generadas al momento del cierre descansaran esos dias sin goce de sueldo.',
        '4. Los dias de vacaciones restantes que no se tomen en el cierre anual podran solicitarse durante el ano, en fechas acordadas previamente con la empresa, sin que esto afecte las operaciones.',
      ],
      firmaIzquierda: `${nombre} — Colaborador`,
      firmaDerecha: 'Recursos Humanos — Jabones y Amenidades de Calidad',
    },
    {
      key: 'cartaUniforme',
      titulo: 'Carta Responsiva de Uniforme',
      cuando: 'Dia 30',
      tantos: '1 tanto',
      descripcion: 'Lista de prendas entregadas, responsabilidad de cuidado y devolucion al terminar la relacion laboral.',
      parrafos: [
        `Yo, ${nombre}, colaborador de ${empresa} en el puesto de ${puesto}, declaro que recibi de la empresa el siguiente uniforme y equipo en buen estado:`,
        '• Playera / camisola con logotipo de la empresa: ____ pieza(s)',
        '• Pantalon de trabajo: ____ pieza(s)',
        '• Cofia: ____ pieza(s)',
        '• Bata / mandil (segun area): ____ pieza(s)',
        '• Otro: ____________________________',
        'Me comprometo a: 1) usar el uniforme completo durante mi jornada de trabajo; 2) mantenerlo limpio y en buen estado; 3) reportar de inmediato cualquier dano o extravio; y 4) devolver a la empresa todas las prendas recibidas al terminar la relacion laboral, en el estado de uso normal que corresponda.',
        'En caso de no devolver las prendas, autorizo que su costo se descuente de mi finiquito conforme a la ley.',
      ],
      firmaIzquierda: `${nombre} — Colaborador`,
      firmaDerecha: `Recursos Humanos — ${empresa}`,
    },
  ];
}

export const DOC_LABELS: Record<SignedDocKey, string> = {
  contrato: 'Contrato individual de trabajo',
  acuseGeneral: 'Acuse general de recepcion',
  avisoISR: 'Aviso de ajuste de ISR',
  convenioVacaciones: 'Convenio de vacaciones',
  cartaUniforme: 'Carta responsiva de uniforme (Dia 30)',
};
