import type { BankQuestion, ExamOutcome, JobPosition, OptionKey, QuestionType } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMEN DE ADMISION v2.0 — BRD Junio 2026
// Estructura: 10 preguntas comunes + 15 especificas por puesto = 25 total
// Calificacion: 22-25 Aprobado | 18-21 Con reserva | 0-17 No aprobado
// REGLA CRITICA: las preguntas viven en el banco editable (store persistido),
// este archivo solo provee la SEMILLA inicial. Nunca se leen directo del codigo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const EXAM_COMMON_COUNT = 10;
export const EXAM_SPECIFIC_COUNT = 15;
export const EXAM_TOTAL = EXAM_COMMON_COUNT + EXAM_SPECIFIC_COUNT;
export const EXAM_PASS_MIN = 22; // 22-25 = Aprobado
export const EXAM_RESERVE_MIN = 18; // 18-21 = Con reserva

export function getExamOutcome(correct: number): ExamOutcome {
  if (correct >= EXAM_PASS_MIN) return 'aprobado';
  if (correct >= EXAM_RESERVE_MIN) return 'con_reserva';
  return 'no_aprobado';
}

export const EXAM_OUTCOME_LABELS: Record<ExamOutcome, { label: string; badge: string }> = {
  aprobado: { label: 'APROBADO', badge: 'badge-green' },
  con_reserva: { label: 'CON RESERVA', badge: 'badge-yellow' },
  no_aprobado: { label: 'NO APROBADO', badge: 'badge-red' },
};

// ─── Semilla del banco de preguntas ──────────────────────────────────────────

interface SeedQuestion {
  id: string;
  tipo: QuestionType;
  puesto: JobPosition | null;
  categoria: string;
  texto: string;
  opciones: Record<OptionKey, string>;
  correcta: OptionKey;
  explicacion: string;
}

const COMMON_SEED: SeedQuestion[] = [
  {
    id: 'C1', tipo: 'comun', puesto: null, categoria: 'Lectura basica',
    texto: "En la puerta de produccion hay un letrero que dice: 'ALTO — SOLO PERSONAL CON COFIA Y CUBREBOCAS'. ¿Que significa?",
    opciones: { a: 'Cualquier persona puede entrar', b: 'Solo entra personal con cofia y cubrebocas', c: 'Esta prohibido entrar siempre', d: 'Solo pueden entrar visitantes' },
    correcta: 'b', explicacion: 'El letrero indica que la entrada requiere cofia y cubrebocas.',
  },
  {
    id: 'C2', tipo: 'comun', puesto: null, categoria: 'Conteo',
    texto: 'En una repisa hay 4 frascos grandes y 5 frascos chicos. ¿Cuantos frascos hay en total?',
    opciones: { a: '8', b: '9', c: '10', d: '11' },
    correcta: 'b', explicacion: '4 + 5 = 9 frascos.',
  },
  {
    id: 'C3', tipo: 'comun', puesto: null, categoria: 'Suma simple',
    texto: '12 + 8 = ?',
    opciones: { a: '18', b: '19', c: '20', d: '21' },
    correcta: 'c', explicacion: '12 + 8 = 20.',
  },
  {
    id: 'C4', tipo: 'comun', puesto: null, categoria: 'Resta simple',
    texto: '20 - 7 = ?',
    opciones: { a: '11', b: '12', c: '13', d: '14' },
    correcta: 'c', explicacion: '20 - 7 = 13.',
  },
  {
    id: 'C5', tipo: 'comun', puesto: null, categoria: 'Multiplicacion simple',
    texto: '4 x 5 = ?',
    opciones: { a: '16', b: '18', c: '20', d: '24' },
    correcta: 'c', explicacion: '4 x 5 = 20.',
  },
  {
    id: 'C6', tipo: 'comun', puesto: null, categoria: 'Seguir instrucciones',
    texto: 'Si hay 3 filas de 6 piezas cada una, ¿cuantas piezas hay en total?',
    opciones: { a: '9', b: '12', c: '18', d: '21' },
    correcta: 'c', explicacion: '3 filas x 6 piezas = 18 piezas.',
  },
  {
    id: 'C7', tipo: 'comun', puesto: null, categoria: 'Orden y limpieza',
    texto: '¿Donde dejas la herramienta al terminar de usarla?',
    opciones: { a: 'Donde sea, alguien la recoge', b: 'En su lugar asignado', c: 'En mi bolsillo para manana', d: 'Se la dejo a un companero' },
    correcta: 'b', explicacion: 'Cada herramienta tiene un lugar asignado; asi todos la encuentran.',
  },
  {
    id: 'C8', tipo: 'comun', puesto: null, categoria: 'Seguridad basica',
    texto: '¿Que haces si ves un derrame en el piso?',
    opciones: { a: 'Lo brinco con cuidado y sigo', b: 'Aviso de inmediato y ayudo a senalizarlo', c: 'Espero a que alguien mas lo vea', d: 'Nada, no es mi area' },
    correcta: 'b', explicacion: 'Un derrame puede causar un accidente; se avisa y se senaliza de inmediato.',
  },
  {
    id: 'C9', tipo: 'comun', puesto: null, categoria: 'Criterio basico',
    texto: 'Si no entiendes una instruccion, ¿que haces?',
    opciones: { a: 'La hago como yo creo que es', b: 'Pregunto a mi jefe antes de hacerla', c: 'Le pido a otro que la haga por mi', d: 'No la hago y no digo nada' },
    correcta: 'b', explicacion: 'Preguntar antes evita errores y retrabajos.',
  },
  {
    id: 'C10', tipo: 'comun', puesto: null, categoria: 'Actitud ante el error',
    texto: 'Cometiste un error en el trabajo, ¿que haces?',
    opciones: { a: 'Lo escondo para que nadie lo vea', b: 'Aviso de inmediato para corregirlo', c: 'Culpo a un companero', d: 'Espero a que alguien lo descubra' },
    correcta: 'b', explicacion: 'Avisar de inmediato permite corregir a tiempo; esconderlo agrava el problema.',
  },
];

const AG_SEED: SeedQuestion[] = [
  {
    id: 'AG1', tipo: 'especifica', puesto: 'AG', categoria: 'Identificacion de defectos',
    texto: '¿Cual de estos envases NO debe empacarse?',
    opciones: { a: 'Etiqueta derecha y limpia', b: 'Tapa bien cerrada', c: 'Envase golpeado y sin etiqueta', d: 'Envase lleno al nivel correcto' },
    correcta: 'c', explicacion: 'Un envase golpeado o sin etiqueta es producto defectuoso y no debe empacarse.',
  },
  {
    id: 'AG2', tipo: 'especifica', puesto: 'AG', categoria: 'Calculo de piezas',
    texto: 'Si una caja lleva 24 piezas y tienes 4 cajas completas, ¿cuantas piezas son en total?',
    opciones: { a: '88', b: '92', c: '96', d: '100' },
    correcta: 'c', explicacion: '24 x 4 = 96 piezas.',
  },
  {
    id: 'AG3', tipo: 'especifica', puesto: 'AG', categoria: 'Producto defectuoso',
    texto: 'Encuentras un jabon manchado en la linea. ¿Que haces con el?',
    opciones: { a: 'Lo empaco rapido para no atrasar', b: 'Lo separo e informo al encargado', c: 'Lo tiro a la basura sin avisar', d: 'Lo limpio con mi mano y lo empaco' },
    correcta: 'b', explicacion: 'El producto defectuoso se separa y se informa; nunca se empaca ni se desecha sin aviso.',
  },
  {
    id: 'AG4', tipo: 'especifica', puesto: 'AG', categoria: 'Empaque',
    texto: '¿Cual es la forma correcta de sellar una caja?',
    opciones: { a: 'Cerrar las tapas y poner cinta firme y derecha', b: 'Doblar las tapas sin cinta', c: 'Poner cinta solo en una esquina', d: 'Dejarla abierta para que la revisen' },
    correcta: 'a', explicacion: 'La caja se cierra con las tapas alineadas y cinta firme para proteger el producto.',
  },
  {
    id: 'AG5', tipo: 'especifica', puesto: 'AG', categoria: 'BPM',
    texto: 'Las Buenas Practicas de Manufactura (BPM) sirven para:',
    opciones: { a: 'Trabajar mas rapido', b: 'Asegurar productos limpios y seguros', c: 'Ahorrar material', d: 'Evitar juntas de trabajo' },
    correcta: 'b', explicacion: 'Las BPM garantizan higiene y seguridad del producto que fabricamos.',
  },
  {
    id: 'AG6', tipo: 'especifica', puesto: 'AG', categoria: 'BPM',
    texto: '¿Para que sirve la cofia?',
    opciones: { a: 'Para verse uniformado', b: 'Para evitar que caiga cabello al producto', c: 'Para protegerse del frio', d: 'Solo se usa cuando hay visitas' },
    correcta: 'b', explicacion: 'La cofia evita que el cabello contamine el producto.',
  },
  {
    id: 'AG7', tipo: 'especifica', puesto: 'AG', categoria: 'Autorizaciones',
    texto: '¿Que NO debes hacer sin autorizacion?',
    opciones: { a: 'Lavarte las manos', b: 'Operar una maquina que no conoces', c: 'Barrer tu area', d: 'Avisar de un defecto' },
    correcta: 'b', explicacion: 'Operar maquinas sin autorizacion ni capacitacion es un riesgo grave.',
  },
  {
    id: 'AG8', tipo: 'especifica', puesto: 'AG', categoria: 'Orden y limpieza',
    texto: '¿Cual es el orden correcto para limpiar tu area al terminar?',
    opciones: { a: 'Barrer primero y luego retirar el producto', b: 'Retirar producto, limpiar superficies y al final barrer el piso', c: 'Solo barrer el piso', d: 'Esperar a que limpie el del siguiente turno' },
    correcta: 'b', explicacion: 'Primero se protege el producto, luego superficies y al final el piso.',
  },
  {
    id: 'AG9', tipo: 'especifica', puesto: 'AG', categoria: 'Materiales',
    texto: '¿Que haces si falta material en tu estacion?',
    opciones: { a: 'Me detengo y no digo nada', b: 'Aviso al encargado de inmediato', c: 'Tomo material de otra linea sin avisar', d: 'Me voy a otra area' },
    correcta: 'b', explicacion: 'Avisar de inmediato evita paros largos de la linea.',
  },
  {
    id: 'AG10', tipo: 'especifica', puesto: 'AG', categoria: 'Higiene',
    texto: '¿Cuando es obligatorio lavarse las manos?',
    opciones: { a: 'Solo al llegar en la manana', b: 'Antes de entrar a produccion y despues de ir al bano', c: 'Solo si se ven sucias', d: 'Una vez por semana' },
    correcta: 'b', explicacion: 'El lavado de manos es obligatorio antes de entrar a produccion y despues del bano.',
  },
  {
    id: 'AG11', tipo: 'especifica', puesto: 'AG', categoria: 'Etiquetado',
    texto: '¿Que informacion debe tener la etiqueta de un producto?',
    opciones: { a: 'Solo el precio', b: 'Nombre del producto, contenido y lote', c: 'El nombre del operador', d: 'Nada, la etiqueta es decorativa' },
    correcta: 'b', explicacion: 'La etiqueta identifica el producto, su contenido y su lote.',
  },
  {
    id: 'AG12', tipo: 'especifica', puesto: 'AG', categoria: 'Calidad',
    texto: '¿Que significa retener un producto?',
    opciones: { a: 'Esconderlo en el almacen', b: 'Separarlo y no usarlo hasta que calidad lo revise', c: 'Regalarlo al personal', d: 'Empacarlo al final del dia' },
    correcta: 'b', explicacion: 'Retener = separar el producto y esperar la revision de calidad.',
  },
  {
    id: 'AG13', tipo: 'especifica', puesto: 'AG', categoria: 'Conteo',
    texto: 'Cuentas 95 piezas pero la orden dice 100. ¿Que haces?',
    opciones: { a: 'Cierro la caja como esta', b: 'Vuelvo a contar y aviso del faltante', c: 'Anoto 100 de todas formas', d: 'Agrego piezas de otro lote sin avisar' },
    correcta: 'b', explicacion: 'Se confirma el conteo y se reporta el faltante; nunca se altera el registro.',
  },
  {
    id: 'AG14', tipo: 'especifica', puesto: 'AG', categoria: 'EPP',
    texto: '¿Que equipo de proteccion se usa en el area de produccion?',
    opciones: { a: 'Cofia, cubrebocas y zapato cerrado', b: 'Gorra y sandalias', c: 'Solo guantes cuando hay frio', d: 'Ninguno si tienes experiencia' },
    correcta: 'a', explicacion: 'En produccion el EPP basico es cofia, cubrebocas y zapato cerrado.',
  },
  {
    id: 'AG15', tipo: 'especifica', puesto: 'AG', categoria: 'Responsabilidad',
    texto: 'Al terminar tu turno, ¿cual es tu responsabilidad?',
    opciones: { a: 'Salir corriendo al checador', b: 'Dejar el area limpia y avisar pendientes al encargado', c: 'Apagar las luces de toda la planta', d: 'Llevarme las herramientas a mi casa' },
    correcta: 'b', explicacion: 'El area queda limpia y los pendientes informados antes de salir.',
  },
];

const AM_SEED: SeedQuestion[] = [
  {
    id: 'AM1', tipo: 'especifica', puesto: 'AM', categoria: 'Herramientas',
    texto: '¿Que herramienta usas para apretar una tuerca?',
    opciones: { a: 'Martillo', b: 'Llave espanola o de tuercas', c: 'Desarmador plano', d: 'Pinzas de corte' },
    correcta: 'b', explicacion: 'Las tuercas se aprietan con llave; el martillo o el desarmador las danan.',
  },
  {
    id: 'AM2', tipo: 'especifica', puesto: 'AM', categoria: 'Medidas',
    texto: '1 pulgada equivale aproximadamente a:',
    opciones: { a: '10 mm', b: '15.4 mm', c: '25.4 mm', d: '30 mm' },
    correcta: 'c', explicacion: '1 pulgada = 25.4 milimetros.',
  },
  {
    id: 'AM3', tipo: 'especifica', puesto: 'AM', categoria: 'Electricidad',
    texto: 'Antes de tocar una maquina electrica para repararla debes:',
    opciones: { a: 'Ponerte guantes de tela', b: 'Desconectar la energia y bloquear el interruptor', c: 'Trabajar rapido para no recibir descarga', d: 'Mojarte las manos' },
    correcta: 'b', explicacion: 'Cortar y bloquear la energia evita descargas y arranques accidentales.',
  },
  {
    id: 'AM4', tipo: 'especifica', puesto: 'AM', categoria: 'Electricidad',
    texto: '¿Para que sirve un multimetro?',
    opciones: { a: 'Para medir voltaje y corriente', b: 'Para apretar tornillos', c: 'Para soldar cables', d: 'Para cortar lamina' },
    correcta: 'a', explicacion: 'El multimetro mide voltaje, corriente y resistencia.',
  },
  {
    id: 'AM5', tipo: 'especifica', puesto: 'AM', categoria: 'Soldadura',
    texto: '¿Que EPP es obligatorio para soldar?',
    opciones: { a: 'Careta, guantes de carnaza y peto', b: 'Solo lentes oscuros', c: 'Cofia y cubrebocas', d: 'Ninguno si la soldadura es rapida' },
    correcta: 'a', explicacion: 'La soldadura requiere careta, guantes de carnaza y peto para proteger de chispas y radiacion.',
  },
  {
    id: 'AM6', tipo: 'especifica', puesto: 'AM', categoria: 'Seguridad',
    texto: '¿Que simbolo indica voltaje peligroso?',
    opciones: { a: 'Una gota de agua', b: 'Un rayo dentro de un triangulo', c: 'Una llama', d: 'Una cruz verde' },
    correcta: 'b', explicacion: 'El rayo en triangulo amarillo advierte riesgo electrico.',
  },
  {
    id: 'AM7', tipo: 'especifica', puesto: 'AM', categoria: 'Seguridad',
    texto: '¿Que extintor se usa para un fuego electrico?',
    opciones: { a: 'De agua', b: 'De CO2 o polvo quimico seco', c: 'Una cubeta de arena mojada', d: 'Cualquiera que este cerca' },
    correcta: 'b', explicacion: 'El agua conduce electricidad; el fuego electrico se apaga con CO2 o PQS.',
  },
  {
    id: 'AM8', tipo: 'especifica', puesto: 'AM', categoria: 'Medidas',
    texto: "¿Que significa una medida de 3/4 de pulgada?",
    opciones: { a: 'Tres pulgadas y cuatro mm', b: 'Tres cuartas partes de una pulgada', c: 'Cuatro pulgadas menos tres', d: 'Una medida solo para tuberia de gas' },
    correcta: 'b', explicacion: '3/4 = tres cuartas partes de una pulgada (aprox. 19 mm).',
  },
  {
    id: 'AM9', tipo: 'especifica', puesto: 'AM', categoria: 'Mantenimiento',
    texto: '¿Cuando NO debes lubricar una maquina?',
    opciones: { a: 'Cuando esta detenida y bloqueada', b: 'Cuando esta en movimiento', c: 'Durante el mantenimiento programado', d: 'Cuando lo indica el manual' },
    correcta: 'b', explicacion: 'Lubricar con la maquina en movimiento puede atrapar manos o ropa.',
  },
  {
    id: 'AM10', tipo: 'especifica', puesto: 'AM', categoria: 'Mantenimiento',
    texto: 'Detectas una fuga en una linea. ¿Que haces primero?',
    opciones: { a: 'La tapo con cinta y me voy', b: 'Cierro o aislo el paso, senalizo y aviso', c: 'Espero a ver si crece', d: 'La limpio sin cerrar el paso' },
    correcta: 'b', explicacion: 'Primero se controla el paso, se senaliza el area y se reporta.',
  },
  {
    id: 'AM11', tipo: 'especifica', puesto: 'AM', categoria: 'Mantenimiento',
    texto: '¿Cual es la diferencia entre mantenimiento correctivo y preventivo?',
    opciones: { a: 'Son lo mismo con distinto nombre', b: 'El preventivo se hace antes de que falle; el correctivo cuando ya fallo', c: 'El correctivo es mas barato siempre', d: 'El preventivo solo lo hace el director' },
    correcta: 'b', explicacion: 'Preventivo = programado antes de la falla; correctivo = reparar lo que ya fallo.',
  },
  {
    id: 'AM12', tipo: 'especifica', puesto: 'AM', categoria: 'Ordenes de trabajo',
    texto: '¿Que informacion debe tener una orden de trabajo?',
    opciones: { a: 'Solo el nombre del tecnico', b: 'Que se va a hacer, donde, cuando y quien lo solicita', c: 'El costo de las refacciones unicamente', d: 'Nada por escrito, todo es de palabra' },
    correcta: 'b', explicacion: 'La orden de trabajo documenta que, donde, cuando y quien.',
  },
  {
    id: 'AM13', tipo: 'especifica', puesto: 'AM', categoria: 'Medidas',
    texto: '¿Cuantos centimetros hay en metro y medio?',
    opciones: { a: '105 cm', b: '115 cm', c: '150 cm', d: '155 cm' },
    correcta: 'c', explicacion: '1.5 metros = 150 centimetros.',
  },
  {
    id: 'AM14', tipo: 'especifica', puesto: 'AM', categoria: 'Seguridad',
    texto: '¿Que precaucion es obligatoria al usar una amoladora (esmeril)?',
    opciones: { a: 'Quitarle la guarda para ver mejor', b: 'Usar guarda, lentes de seguridad y sujetarla firme', c: 'Usarla con una sola mano', d: 'Usarla cerca de material inflamable' },
    correcta: 'b', explicacion: 'La guarda y los lentes protegen de chispas y fragmentos del disco.',
  },
  {
    id: 'AM15', tipo: 'especifica', puesto: 'AM', categoria: 'Orden',
    texto: '¿Como deben quedar las herramientas al terminar el trabajo?',
    opciones: { a: 'Donde se uso la ultima', b: 'Limpias y en su lugar del tablero o caja', c: 'En el piso para manana', d: 'Guardadas en mi mochila' },
    correcta: 'b', explicacion: 'Las herramientas se devuelven limpias a su lugar asignado.',
  },
];

const AO_SEED: SeedQuestion[] = [
  {
    id: 'AO1', tipo: 'especifica', puesto: 'AO', categoria: 'Excel',
    texto: '¿Para que sirve la funcion SUMA en Excel?',
    opciones: { a: 'Para sumar los valores de un rango de celdas', b: 'Para borrar una hoja', c: 'Para cambiar el color de la celda', d: 'Para imprimir el documento' },
    correcta: 'a', explicacion: 'SUMA agrega los valores de las celdas indicadas.',
  },
  {
    id: 'AO2', tipo: 'especifica', puesto: 'AO', categoria: 'Excel',
    texto: '¿Como ordenas una lista de nombres de la A a la Z en Excel?',
    opciones: { a: 'Borrando los que no van en orden', b: 'Seleccionando la columna y usando Ordenar de A a Z', c: 'Escribiendo todo de nuevo', d: 'No se puede ordenar en Excel' },
    correcta: 'b', explicacion: 'La opcion Ordenar de A a Z ordena la columna seleccionada.',
  },
  {
    id: 'AO3', tipo: 'especifica', puesto: 'AO', categoria: 'Computacion',
    texto: '¿Que hace el atajo Ctrl+Z?',
    opciones: { a: 'Guarda el archivo', b: 'Deshace la ultima accion', c: 'Cierra el programa', d: 'Imprime la pagina' },
    correcta: 'b', explicacion: 'Ctrl+Z deshace la ultima accion realizada.',
  },
  {
    id: 'AO4', tipo: 'especifica', puesto: 'AO', categoria: 'Computacion',
    texto: '¿Que es un archivo PDF?',
    opciones: { a: 'Un documento que conserva su formato y no se modifica facilmente', b: 'Una hoja de calculo', c: 'Un programa para chatear', d: 'Una carpeta del sistema' },
    correcta: 'a', explicacion: 'El PDF mantiene el formato igual en cualquier equipo; ideal para compartir.',
  },
  {
    id: 'AO5', tipo: 'especifica', puesto: 'AO', categoria: 'Computacion',
    texto: '¿Como guardas un documento con un nombre nuevo sin perder el original?',
    opciones: { a: 'Con Guardar como', b: 'Con Ctrl+Z', c: 'Cerrando sin guardar', d: 'Borrando el original primero' },
    correcta: 'a', explicacion: "'Guardar como' crea una copia con otro nombre y conserva el original.",
  },
  {
    id: 'AO6', tipo: 'especifica', puesto: 'AO', categoria: 'Correo',
    texto: '¿Que debe tener el asunto de un correo de trabajo?',
    opciones: { a: 'Debe ir vacio', b: 'Una frase breve y clara del tema del correo', c: 'Todo el contenido del mensaje', d: 'Solo emojis' },
    correcta: 'b', explicacion: 'El asunto resume el tema en pocas palabras para que el correo se identifique rapido.',
  },
  {
    id: 'AO7', tipo: 'especifica', puesto: 'AO', categoria: 'Confidencialidad',
    texto: '¿Que haces con un archivo confidencial de la empresa?',
    opciones: { a: 'Lo comparto con quien me lo pida', b: 'Lo guardo donde corresponde y no lo comparto sin autorizacion', c: 'Lo subo a mis redes', d: 'Lo imprimo y lo dejo en la impresora' },
    correcta: 'b', explicacion: 'La informacion confidencial solo se comparte con autorizacion.',
  },
  {
    id: 'AO8', tipo: 'especifica', puesto: 'AO', categoria: 'Word',
    texto: '¿Como insertas una tabla en Word?',
    opciones: { a: 'Menu Insertar → Tabla', b: 'Dibujandola con plumon en la pantalla', c: 'Con Ctrl+Z', d: 'Word no maneja tablas' },
    correcta: 'a', explicacion: 'Las tablas se insertan desde el menu Insertar → Tabla.',
  },
  {
    id: 'AO9', tipo: 'especifica', puesto: 'AO', categoria: 'Excel',
    texto: 'En Excel, ¿que es una celda?',
    opciones: { a: 'El cruce de una fila con una columna', b: 'Un tipo de grafica', c: 'El nombre del archivo', d: 'Un boton de la impresora' },
    correcta: 'a', explicacion: 'La celda es la interseccion de una fila y una columna (ej. A1).',
  },
  {
    id: 'AO10', tipo: 'especifica', puesto: 'AO', categoria: 'Excel',
    texto: '¿Cual es la formula correcta para sumar las celdas A1 a A5?',
    opciones: { a: '=SUMA(A1:A5)', b: 'SUMAR A1 A5', c: '=A1+A5 solamente', d: '=TOTAL(A1,A5)' },
    correcta: 'a', explicacion: '=SUMA(A1:A5) suma todo el rango de A1 hasta A5.',
  },
  {
    id: 'AO11', tipo: 'especifica', puesto: 'AO', categoria: 'Documentos',
    texto: '¿Que debe incluir una carta formal?',
    opciones: { a: 'Fecha, destinatario, asunto, cuerpo, despedida y firma', b: 'Solo la firma', c: 'Puras abreviaturas', d: 'Stickers y colores llamativos' },
    correcta: 'a', explicacion: 'Una carta formal lleva fecha, destinatario, asunto, cuerpo, despedida y firma.',
  },
  {
    id: 'AO12', tipo: 'especifica', puesto: 'AO', categoria: 'Archivo',
    texto: '¿Como se organizan los documentos fisicos de la oficina?',
    opciones: { a: 'En un solo monton sobre el escritorio', b: 'En carpetas etiquetadas y archivadas por tema o fecha', c: 'En cajas sin marcar', d: 'Se tiran al final del mes' },
    correcta: 'b', explicacion: 'Carpetas etiquetadas por tema o fecha permiten encontrar todo rapido.',
  },
  {
    id: 'AO13', tipo: 'especifica', puesto: 'AO', categoria: 'Confidencialidad',
    texto: 'Llaman por telefono pidiendo informacion confidencial de un empleado. ¿Que haces?',
    opciones: { a: 'La doy si suenan amables', b: 'No la doy y canalizo la llamada con el responsable', c: 'Pido que llamen mas tarde y la doy', d: 'Doy solo la mitad de la informacion' },
    correcta: 'b', explicacion: 'La informacion confidencial no se da por telefono; se canaliza al responsable.',
  },
  {
    id: 'AO14', tipo: 'especifica', puesto: 'AO', categoria: 'Organizacion',
    texto: 'Tienes varios pendientes. ¿Como los priorizas?',
    opciones: { a: 'Por urgencia e importancia', b: 'Por orden alfabetico', c: 'El que sea mas facil primero siempre', d: 'No los priorizo, hago lo que recuerde' },
    correcta: 'a', explicacion: 'Se atiende primero lo urgente e importante.',
  },
  {
    id: 'AO15', tipo: 'especifica', puesto: 'AO', categoria: 'Criterio',
    texto: 'Mandaste un documento con un error. ¿Que haces?',
    opciones: { a: 'Espero a que nadie lo note', b: 'Aviso de inmediato y envio la correccion', c: 'Niego haberlo enviado', d: 'Culpo al sistema' },
    correcta: 'b', explicacion: 'Avisar y corregir de inmediato mantiene la confianza y evita problemas mayores.',
  },
];

const EC_SEED: SeedQuestion[] = [
  {
    id: 'EC1', tipo: 'especifica', puesto: 'EC', categoria: 'BPM',
    texto: '¿Que son las BPM y cual es su objetivo?',
    opciones: { a: 'Buenas Practicas de Manufactura; garantizar higiene y seguridad del producto', b: 'Un bono de productividad mensual', c: 'Una marca de basculas', d: 'El reglamento de estacionamiento' },
    correcta: 'a', explicacion: 'Las BPM aseguran que el producto se fabrique en condiciones higienicas y seguras.',
  },
  {
    id: 'EC2', tipo: 'especifica', puesto: 'EC', categoria: 'Muestras',
    texto: '¿Para que sirven las muestras de retencion?',
    opciones: { a: 'Para regalar a clientes', b: 'Para conservar una referencia de cada lote y poder revisarla despues', c: 'Para rellenar pedidos incompletos', d: 'No sirven, son merma' },
    correcta: 'b', explicacion: 'La muestra de retencion permite verificar el lote si surge un reclamo o duda.',
  },
  {
    id: 'EC3', tipo: 'especifica', puesto: 'EC', categoria: 'Producto no conforme',
    texto: '¿Que haces con producto fuera de especificacion?',
    opciones: { a: 'Lo dejo pasar si el cliente tiene prisa', b: 'Lo retengo, lo identifico y documento la desviacion', c: 'Lo mezclo con producto bueno', d: 'Lo escondo del auditor' },
    correcta: 'b', explicacion: 'El producto fuera de especificacion se retiene, se identifica y se documenta.',
  },
  {
    id: 'EC4', tipo: 'especifica', puesto: 'EC', categoria: 'Trazabilidad',
    texto: '¿Que es la trazabilidad?',
    opciones: { a: 'Poder rastrear el origen y la historia de un lote', b: 'Un tipo de etiqueta adhesiva', c: 'El dibujo tecnico de la planta', d: 'La velocidad de la linea' },
    correcta: 'a', explicacion: 'Trazabilidad = seguir el rastro de materiales y procesos de cada lote.',
  },
  {
    id: 'EC5', tipo: 'especifica', puesto: 'EC', categoria: 'Producto no conforme',
    texto: '¿Cual es la diferencia entre retener y rechazar un producto?',
    opciones: { a: 'Ninguna, es lo mismo', b: 'Retener = en espera de decision; rechazar = no se usa definitivamente', c: 'Rechazar es guardarlo un mes', d: 'Retener es venderlo con descuento' },
    correcta: 'b', explicacion: 'Retenido espera evaluacion; rechazado queda fuera definitivamente.',
  },
  {
    id: 'EC6', tipo: 'especifica', puesto: 'EC', categoria: 'Calibracion',
    texto: '¿Como verificas la calibracion de una bascula?',
    opciones: { a: 'Pesando un objeto cualquiera', b: 'Con pesas patron certificadas y registrando el resultado', c: 'A simple vista', d: 'Golpeandola suavemente' },
    correcta: 'b', explicacion: 'La calibracion se verifica con pesas patron y se registra.',
  },
  {
    id: 'EC7', tipo: 'especifica', puesto: 'EC', categoria: 'Etiquetado',
    texto: "Una etiqueta dice 'Lote: ___' (vacio) y sin fecha. ¿Que haces?",
    opciones: { a: 'La dejo pasar, el contenido esta bien', b: 'Detengo el etiquetado y corrijo antes de liberar', c: 'Escribo cualquier numero a mano', d: 'Quito todas las etiquetas' },
    correcta: 'b', explicacion: 'Sin lote ni fecha no hay trazabilidad; se corrige antes de liberar.',
  },
  {
    id: 'EC8', tipo: 'especifica', puesto: 'EC', categoria: 'Arranque de linea',
    texto: '¿Que revisas en el arranque de una linea?',
    opciones: { a: 'Limpieza del area, materiales correctos y primeras piezas conformes', b: 'Solo que haya cafe para el equipo', c: 'Unicamente la velocidad maxima', d: 'Nada, se arranca directo' },
    correcta: 'a', explicacion: 'El arranque verifica limpieza, materiales y primeras piezas.',
  },
  {
    id: 'EC9', tipo: 'especifica', puesto: 'EC', categoria: 'Lotes',
    texto: '¿Que es un lote de produccion?',
    opciones: { a: 'La cantidad producida bajo las mismas condiciones en un periodo definido', b: 'Una caja individual', c: 'El nombre de la maquina', d: 'El turno de la manana' },
    correcta: 'a', explicacion: 'El lote agrupa lo producido bajo las mismas condiciones para su control.',
  },
  {
    id: 'EC10', tipo: 'especifica', puesto: 'EC', categoria: 'Desviaciones',
    texto: '¿Como se documenta una desviacion?',
    opciones: { a: 'Se cuenta de palabra en el pasillo', b: 'Registrando que paso, cuando, causa probable y accion tomada', c: 'No se documenta para no alarmar', d: 'Con una foto en el celular personal' },
    correcta: 'b', explicacion: 'La desviacion se registra con hechos, fecha, causa y accion.',
  },
  {
    id: 'EC11', tipo: 'especifica', puesto: 'EC', categoria: 'Registros',
    texto: '¿Que informacion lleva un registro de limpieza?',
    opciones: { a: 'Area, fecha, quien limpio y firma de verificacion', b: 'Solo la palabra LIMPIO', c: 'El precio de los detergentes', d: 'Nada, la limpieza no se registra' },
    correcta: 'a', explicacion: 'El registro de limpieza documenta area, fecha, responsable y verificacion.',
  },
  {
    id: 'EC12', tipo: 'especifica', puesto: 'EC', categoria: 'Condiciones de proceso',
    texto: 'El termometro del area marca por arriba del limite permitido. ¿Que haces?',
    opciones: { a: 'Lo ignoro si es poquito', b: 'Registro la desviacion, aviso y se evalua el producto expuesto', c: 'Apago el termometro', d: 'Abro la puerta y ya' },
    correcta: 'b', explicacion: 'Una condicion fuera de limite se registra, se avisa y se evalua su impacto.',
  },
  {
    id: 'EC13', tipo: 'especifica', puesto: 'EC', categoria: 'Almacen',
    texto: '¿Que significa FIFO?',
    opciones: { a: 'Primero en entrar, primero en salir', b: 'Ultimo en entrar, primero en salir', c: 'Una marca de montacargas', d: 'Final de inventario fisico obligatorio' },
    correcta: 'a', explicacion: 'FIFO: lo primero que entra al almacen es lo primero que se usa.',
  },
  {
    id: 'EC14', tipo: 'especifica', puesto: 'EC', categoria: 'Manejo de personal',
    texto: 'Un operador comete el mismo error y no lo corrige. ¿Como lo manejas?',
    opciones: { a: 'Lo regano frente a todos', b: 'Hablo con el, lo documento e informo a su jefe directo si reincide', c: 'Hago su trabajo yo mismo siempre', d: 'No digo nada para evitar conflicto' },
    correcta: 'b', explicacion: 'Se corrige con respeto, se documenta y se escala si reincide.',
  },
  {
    id: 'EC15', tipo: 'especifica', puesto: 'EC', categoria: 'Lotes',
    texto: '¿Que es un numero de lote y donde debe aparecer?',
    opciones: { a: 'Un codigo que identifica la produccion; aparece en la etiqueta del producto', b: 'El numero de serie de la maquina; aparece en el manual', c: 'El folio de la factura; aparece en caja chica', d: 'Un numero al azar que no se imprime' },
    correcta: 'a', explicacion: 'El numero de lote identifica la produccion y debe ir impreso en la etiqueta.',
  },
];

export function getSeedQuestions(): BankQuestion[] {
  const all = [...COMMON_SEED, ...AG_SEED, ...AM_SEED, ...AO_SEED, ...EC_SEED];
  const now = new Date().toISOString();
  return all.map((q, idx) => ({
    ...q,
    activa: true,
    ordenSugerido: idx + 1,
    creadaPor: 'Sistema (semilla BRD v2.0)',
    creadaEn: now,
    historial: [{ fecha: now, usuario: 'Sistema', accion: 'Pregunta creada desde la semilla del BRD v2.0' }],
  }));
}
