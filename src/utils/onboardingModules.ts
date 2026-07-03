import type { OnboardingModule } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — VIDEOS GENERALES DE CAPACITACION — SEMANA 1 (BRD seccion 7)
// 10 videos del BRD + presentacion de la empresa (v2.3).
// Los criticos llevan mini evaluacion con minimo 70%.
// Si no aprueba: repite el video COMPLETO antes de volver a contestar.
// Maximo 3 intentos → alerta inmediata a Direccion + bloqueo.
// Boton 'Tengo dudas' → alerta inmediata a RH y jefe directo.
// Orden secuencial obligatorio. Sin firmas: solo confirmacion digital
// (el colaborador firma unicamente los 5 documentos fisicos).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const VIDEO_PASS_PERCENT = 70; // confirmado por Direccion
export const VIDEO_MAX_ATTEMPTS = 3;

export function videoPassThreshold(questionCount: number): number {
  return Math.ceil((VIDEO_PASS_PERCENT / 100) * questionCount);
}

export function getDefaultOnboardingModules(): OnboardingModule[] {
  const base = { deliveredBy: 'Video en tablet', requiresSignature: false, completed: false, isVideo: true };
  return [
    { id: 1, name: 'Bienvenida e historia de la empresa', duration: '3 min', durationMin: 3, critical: false, ...base },
    { id: 2, name: 'Horario, checado y pago', duration: '2 min', durationMin: 2, critical: false, ...base },
    { id: 3, name: 'Uniforme y equipo de proteccion personal', duration: '2 min', durationMin: 2, critical: true, questionsCount: 4, ...base },
    { id: 4, name: 'Buenas Practicas de Manufactura basicas', duration: '2 min', durationMin: 2, critical: true, questionsCount: 5, ...base },
    { id: 5, name: 'Orden y limpieza', duration: '2 min', durationMin: 2, critical: true, questionsCount: 3, ...base },
    { id: 6, name: 'Seguridad basica en planta', duration: '2 min', durationMin: 2, critical: true, questionsCount: 4, ...base },
    { id: 7, name: 'Comedor, lockers y areas comunes', duration: '1.5 min', durationMin: 1.5, critical: false, ...base },
    { id: 8, name: 'Uso de celular y confidencialidad', duration: '2 min', durationMin: 2, critical: true, questionsCount: 3, ...base },
    { id: 9, name: 'Videovigilancia y camaras de seguridad', duration: '1.5 min', durationMin: 1.5, critical: true, questionsCount: 3, ...base },
    { id: 10, name: 'Que hacer en caso de accidente', duration: '2 min', durationMin: 2, critical: true, questionsCount: 4, ...base },
    // v2.3 — pedido por Direccion ademas de los 10 del BRD
    { id: 11, name: 'Presentacion de la empresa', duration: '1 min', durationMin: 1, critical: false, ...base },
  ];
}

// ─── Guiones de narracion (modo "narrado": audio TTS + subtitulos) ──────────
// Texto exacto que se narra en cada video. Los subtitulos avanzan con el audio.
export interface OnboardingNarrationCaption {
  titulo: string;
  texto: string;
}

export function getOnboardingVideoScript(moduleId: number): OnboardingNarrationCaption[] {
  const scripts: Record<number, OnboardingNarrationCaption[]> = {
    1: [
      { titulo: 'Bienvenida', texto: 'Bienvenido a Jabones y Amenidades de Calidad. Nos da mucho gusto que formes parte del equipo.' },
      { titulo: 'Quienes somos', texto: 'Somos una empresa mexicana que fabrica productos de higiene y amenidades desde hace mas de tres decadas.' },
      { titulo: 'Nuestro compromiso', texto: 'Cuidamos la calidad en cada detalle, porque nuestros productos llegan a muchas personas.' },
      { titulo: 'Tu papel', texto: 'Tu trabajo es importante para lograrlo. En este primer dia veras videos cortos que te explican como trabajamos aqui.' },
    ],
    2: [
      { titulo: 'Horario', texto: 'Trabajamos de lunes a sabado en jornada completa. La puntualidad es indispensable todos los dias.' },
      { titulo: 'Checado', texto: 'Al llegar y al salir debes checar tu asistencia. Si vas a faltar o llegar tarde, avisa a tu supervisor con anticipacion.' },
      { titulo: 'Dia de pago', texto: 'El pago es semanal: recibes tu pago cada sabado.' },
    ],
    3: [
      { titulo: 'Uniforme completo', texto: 'El uniforme completo se usa durante toda la jornada de trabajo, no solo cuando hay visitas.' },
      { titulo: 'La cofia', texto: 'La cofia sirve para evitar que caiga cabello al producto. Por eso es obligatoria en produccion.' },
      { titulo: 'Equipo de proteccion', texto: 'El equipo de proteccion personal, o EPP, se usa siempre que tu area lo requiera.' },
      { titulo: 'Si se dana', texto: 'Si tu uniforme se dana, reportalo de inmediato a Recursos Humanos.' },
    ],
    4: [
      { titulo: 'Que son las BPM', texto: 'BPM significa Buenas Practicas de Manufactura. Aplican a todos los colaboradores en planta.' },
      { titulo: 'Lavado de manos', texto: 'Antes de entrar a produccion es obligatorio lavarse las manos.' },
      { titulo: 'Sin joyeria', texto: 'El uso de joyeria en produccion esta prohibido, porque puede contaminar el producto.' },
      { titulo: 'Producto contaminado', texto: 'Si encuentras un producto contaminado, reportalo de inmediato. No lo empaques ni lo tires sin avisar.' },
    ],
    5: [
      { titulo: 'Cada cosa en su lugar', texto: 'Al terminar de usar una herramienta, regresala a su lugar asignado.' },
      { titulo: 'Area limpia', texto: 'Tu area de trabajo debe quedar limpia todos los dias, al terminar tu turno.' },
      { titulo: 'Todos ayudamos', texto: 'Si ves basura o material fuera de lugar, lo recoges o avisas, aunque no sea tuyo.' },
    ],
    6: [
      { titulo: 'Derrames', texto: 'Si ves un derrame en el piso, avisa y ayuda a senalizarlo para evitar accidentes.' },
      { titulo: 'Evacuacion', texto: 'En un simulacro de evacuacion, sigue la ruta hasta el punto de reunion. No corras por donde sea.' },
      { titulo: 'Maquinas', texto: 'Nunca operes una maquina que no conoces sin autorizacion y capacitacion.' },
      { titulo: 'Reporta riesgos', texto: 'Si detectas una condicion peligrosa, reportala de inmediato a tu jefe.' },
    ],
    7: [
      { titulo: 'Comedor', texto: 'El comedor es para tus alimentos en los horarios de descanso. Mantenlo limpio.' },
      { titulo: 'Lockers', texto: 'Tienes un locker para tus cosas personales. Cuida tus pertenencias y las de tus companeros.' },
      { titulo: 'Areas comunes', texto: 'Las areas comunes son de todos. Dejalas como te gustaria encontrarlas.' },
    ],
    8: [
      { titulo: 'El celular', texto: 'Durante la jornada, el celular se guarda. Se usa solo en descansos y en areas permitidas.' },
      { titulo: 'Informacion confidencial', texto: 'Las formulas, procesos y datos de clientes son confidenciales. No se comparten ni se fotografian.' },
      { titulo: 'Fotos y videos', texto: 'Tomar fotos o videos dentro de la planta solo se permite con autorizacion expresa.' },
    ],
    9: [
      { titulo: 'Para que sirven', texto: 'Las camaras de videovigilancia estan para la seguridad y proteccion de las personas y los bienes.' },
      { titulo: 'Se te informa', texto: 'Se te informa de la videovigilancia mediante este video y un acuse que firmas, sin excepcion.' },
      { titulo: 'Camara danada', texto: 'Si una camara esta danada o tapada, reportalo a tu jefe o a Recursos Humanos.' },
    ],
    10: [
      { titulo: 'Avisa primero', texto: 'Si ocurre un accidente de trabajo, lo primero es avisar de inmediato al jefe o encargado.' },
      { titulo: 'No lo muevas', texto: 'Si el accidentado esta grave, no lo muevas y pide ayuda de inmediato.' },
      { titulo: 'Reporta todo', texto: 'Todo accidente, aunque parezca leve, se reporta siempre.' },
      { titulo: 'Botiquin y extintor', texto: 'Debes saber donde estan el botiquin y el extintor de tu area.' },
    ],
    11: [
      { titulo: 'Quienes somos', texto: 'Jabones y Amenidades de Calidad es una empresa cien por ciento mexicana, con mas de tres decadas fabricando productos de higiene.' },
      { titulo: 'Que hacemos', texto: 'Fabricamos jabones y amenidades para hoteles: jabon, shampoo, acondicionador y mas productos que acompanan a miles de huespedes todos los dias.' },
      { titulo: 'Nuestra calidad', texto: 'Cada pieza que sale de esta planta lleva el trabajo y el cuidado de todo el equipo. La calidad es nuestra carta de presentacion.' },
      { titulo: 'Nuestros valores', texto: 'Trabajamos con honestidad, limpieza y respeto, para que cada cliente reciba un producto del que estemos orgullosos.' },
      { titulo: 'Eres parte', texto: 'Desde hoy tu tambien formas parte de esta historia. Bienvenido al equipo.' },
    ],
  };
  return scripts[moduleId] || [];
}

/** Texto plano concatenado del guion, para generar la narracion TTS. */
export function getOnboardingNarrationText(moduleId: number): string {
  return getOnboardingVideoScript(moduleId)
    .map((c) => c.texto)
    .join(' ');
}

// Mini evaluaciones de los videos criticos v2.0
export function getVideoQuizQuestions(moduleId: number): { question: string; options: string[]; correct: number }[] {
  const quizzes: Record<number, { question: string; options: string[]; correct: number }[]> = {
    3: [
      { question: 'El uniforme completo se usa:', options: ['Solo cuando hay visitas', 'Durante toda la jornada de trabajo', 'Solo en invierno', 'Solo el primer dia'], correct: 1 },
      { question: '¿Para que sirve la cofia?', options: ['Para verse uniformado', 'Para evitar que caiga cabello al producto', 'Para el frio', 'Es opcional'], correct: 1 },
      { question: 'Si tu uniforme se dana, debes:', options: ['Seguir usandolo roto', 'Reportarlo de inmediato a RH', 'Tirarlo a la basura', 'Comprar otro por tu cuenta'], correct: 1 },
      { question: 'El equipo de proteccion personal (EPP) se usa:', options: ['Solo si tu quieres', 'Siempre que tu area lo requiera', 'Solo en auditorias', 'Nunca'], correct: 1 },
    ],
    4: [
      { question: '¿Que significa BPM?', options: ['Buenas Practicas de Manufactura', 'Base de Produccion Manual', 'Bono Por Mes', 'Bienes Para Manufactura'], correct: 0 },
      { question: 'Antes de entrar a produccion es obligatorio:', options: ['Comer algo', 'Lavarse las manos', 'Revisar el celular', 'Quitarse la cofia'], correct: 1 },
      { question: 'El uso de joyeria en produccion esta:', options: ['Permitido solo anillos', 'Prohibido', 'Permitido con reloj', 'A criterio de cada quien'], correct: 1 },
      { question: 'Si encuentras producto contaminado debes:', options: ['Ignorarlo', 'Limpiarlo tu mismo y empacarlo', 'Reportarlo de inmediato', 'Tirarlo sin avisar'], correct: 2 },
      { question: 'Las BPM aplican a:', options: ['Solo produccion', 'Solo supervisores', 'Todos los colaboradores en planta', 'Solo calidad'], correct: 2 },
    ],
    5: [
      { question: 'Al terminar de usar una herramienta debes:', options: ['Dejarla donde sea', 'Regresarla a su lugar asignado', 'Guardarla en tu locker', 'Prestarla'], correct: 1 },
      { question: 'Tu area de trabajo debe quedar limpia:', options: ['Una vez por semana', 'Todos los dias, al terminar el turno', 'Solo cuando hay visitas', 'Eso le toca a otro'], correct: 1 },
      { question: 'Si ves basura o material fuera de lugar:', options: ['Lo recoges o avisas, aunque no sea tuyo', 'Lo ignoras', 'Esperas a que otro lo vea', 'Lo escondes'], correct: 0 },
    ],
    6: [
      { question: 'Si ves un derrame en el piso:', options: ['Lo brincas', 'Avisas y ayudas a senalizarlo', 'Sigues trabajando', 'No es tu problema'], correct: 1 },
      { question: 'En un simulacro de evacuacion debes:', options: ['Quedarte en tu lugar', 'Seguir la ruta de evacuacion al punto de reunion', 'Correr por donde sea', 'Esconderte'], correct: 1 },
      { question: '¿Que NO debes hacer sin autorizacion y capacitacion?', options: ['Lavarte las manos', 'Operar una maquina que no conoces', 'Barrer tu area', 'Avisar de un riesgo'], correct: 1 },
      { question: 'Si detectas una condicion peligrosa:', options: ['La reportas de inmediato a tu jefe', 'La arreglas tu solo', 'No dices nada', 'Esperas al dia siguiente'], correct: 0 },
    ],
    8: [
      { question: 'El celular durante la jornada de trabajo:', options: ['Se usa libremente', 'Se guarda; se usa solo en descansos y areas permitidas', 'Se usa escondido', 'Se entrega a RH para siempre'], correct: 1 },
      { question: 'La informacion de formulas, procesos y clientes es:', options: ['Publica', 'Confidencial — no se comparte ni se fotografia', 'Para redes sociales', 'Del colaborador'], correct: 1 },
      { question: 'Tomar fotos o videos dentro de la planta:', options: ['Esta permitido siempre', 'Solo con autorizacion expresa', 'Solo los viernes', 'Es obligatorio'], correct: 1 },
    ],
    9: [
      { question: 'Las camaras de videovigilancia estan para:', options: ['Espiar conversaciones personales', 'Seguridad y proteccion de personas y bienes', 'Decoracion', 'Contar la produccion'], correct: 1 },
      { question: '¿Como se te informa de la videovigilancia?', options: ['No se informa', 'Mediante video y acuse firmado — sin excepcion', 'Por rumores', 'Solo de palabra'], correct: 1 },
      { question: 'Si una camara esta danada o tapada:', options: ['No es tu asunto', 'Lo reportas a tu jefe o RH', 'La destapas tu mismo', 'La ignoras'], correct: 1 },
    ],
    10: [
      { question: 'Si ocurre un accidente de trabajo, lo PRIMERO es:', options: ['Seguir trabajando', 'Avisar de inmediato al jefe o encargado', 'Esperar al final del turno', 'Tomar fotos'], correct: 1 },
      { question: 'Si el accidentado esta grave:', options: ['Lo mueves rapido', 'No lo mueves y pides ayuda de inmediato', 'Le das agua', 'Lo llevas caminando'], correct: 1 },
      { question: 'Todo accidente, aunque parezca leve:', options: ['Se reporta siempre', 'Se oculta para no causar problemas', 'Se reporta solo si hay sangre', 'Se anota al fin de mes'], correct: 0 },
      { question: 'El botiquin y el extintor:', options: ['Debes saber donde estan en tu area', 'Son solo para el supervisor', 'No existen', 'Se usan como adorno'], correct: 0 },
    ],
  };
  return quizzes[moduleId] || [];
}

// ─── v1 (legacy) — se conserva para expedientes creados antes de v2.0 ────────

export function getLegacyOnboardingModules(): OnboardingModule[] {
  return [
    { id: 1, name: 'Bienvenida — Mensaje del Director', deliveredBy: 'Solo (lee en tableta)', duration: '5 min', requiresSignature: false, completed: false },
    { id: 2, name: 'Historia de la empresa (desde 1989)', deliveredBy: 'Solo (lee en tableta)', duration: '5 min', requiresSignature: false, completed: false },
    { id: 3, name: 'Productos que fabricamos', deliveredBy: 'Solo (lee + imagenes)', duration: '5 min', requiresSignature: false, completed: false },
    { id: 4, name: 'Mision, Vision y Valores', deliveredBy: 'Solo (lee en tableta)', duration: '5 min', requiresSignature: false, completed: false },
    { id: 5, name: 'Organigrama — a quien reporta', deliveredBy: 'Supervisor explica', duration: '10 min', requiresSignature: false, completed: false },
    { id: 6, name: 'BPM — Buenas Practicas de Manufactura', deliveredBy: 'Supervisor + tableta', duration: '20 min', requiresSignature: true, completed: false },
    { id: 7, name: 'Codigo de vestimenta y presentacion', deliveredBy: 'Solo (lee + imagenes)', duration: '10 min', requiresSignature: true, completed: false },
    { id: 8, name: 'Metodologia 5S', deliveredBy: 'Supervisor + tableta', duration: '15 min', requiresSignature: true, completed: false },
    { id: 9, name: 'Reglamento Interno de Trabajo', deliveredBy: 'Solo (lee en tableta)', duration: '20 min', requiresSignature: true, completed: false },
    { id: 10, name: 'Politicas: asistencia, pago, comunicacion', deliveredBy: 'Solo (lee en tableta)', duration: '10 min', requiresSignature: true, completed: false },
    { id: 11, name: 'Prestaciones de ley y adicionales', deliveredBy: 'Supervisor explica', duration: '15 min', requiresSignature: false, completed: false },
    { id: 12, name: 'Caja de ahorro — como funciona', deliveredBy: 'Supervisor explica', duration: '10 min', requiresSignature: false, completed: false },
    { id: 13, name: 'ISR en semanas de 5 dias', deliveredBy: 'Supervisor explica', duration: '5 min', requiresSignature: false, completed: false },
    { id: 14, name: 'Bonos de productividad — como funcionan', deliveredBy: 'Supervisor explica', duration: '10 min', requiresSignature: false, completed: false },
    { id: 15, name: 'Seguridad e higiene / CMSH / simulacros', deliveredBy: 'Supervisor + tableta', duration: '15 min', requiresSignature: true, completed: false },
    { id: 16, name: 'Descripcion de su puesto especifico', deliveredBy: 'Supervisor + tableta', duration: '20 min', requiresSignature: true, completed: false },
    { id: 17, name: 'Capacitacion inicial del area de trabajo', deliveredBy: 'Supervisor en planta', duration: 'Variable', requiresSignature: true, completed: false },
    { id: 18, name: 'Quiz final de comprension general', deliveredBy: 'Solo (responde en tableta)', duration: '15 min', requiresSignature: true, completed: false },
  ];
}

export const QUIZ_MODULES = [6, 8, 9, 15, 16];

export function getQuizQuestions(moduleId: number): { question: string; options: string[]; correct: number }[] {
  const quizzes: Record<number, { question: string; options: string[]; correct: number }[]> = {
    6: [
      { question: 'Que significa BPM?', options: ['Buenas Practicas de Manufactura', 'Base de Produccion Manual', 'Beneficios Para Manufactura', 'Bienes de Produccion Minima'], correct: 0 },
      { question: 'Antes de entrar al area de produccion, es obligatorio:', options: ['Comer algo', 'Lavarse las manos', 'Revisar el celular', 'Firmar asistencia'], correct: 1 },
      { question: 'El uso de joyeria en produccion esta:', options: ['Permitido solo anillos', 'Prohibido', 'Permitido solo reloj', 'A criterio de cada uno'], correct: 1 },
      { question: 'Si encuentras un producto contaminado debes:', options: ['Ignorarlo', 'Limpiarlo tu mismo', 'Reportarlo al supervisor', 'Tirarlo a la basura'], correct: 2 },
      { question: 'Las BPM aplican a:', options: ['Solo al area de produccion', 'Solo a los supervisores', 'Todos los colaboradores en planta', 'Solo a calidad'], correct: 2 },
    ],
    8: [
      { question: 'Que significa la primera S (Seiri)?', options: ['Limpiar', 'Clasificar', 'Ordenar', 'Estandarizar'], correct: 1 },
      { question: 'El objetivo de 5S es:', options: ['Producir mas', 'Mantener el area limpia y organizada', 'Reducir personal', 'Trabajar mas rapido'], correct: 1 },
      { question: 'Si un objeto no se usa en tu area, debes:', options: ['Guardarlo por si acaso', 'Moverlo a su lugar correcto o desecharlo', 'Dejarlo donde esta', 'Prestarlo a otro compañero'], correct: 1 },
      { question: 'Seiketsu (4ta S) se refiere a:', options: ['Limpiar', 'Clasificar', 'Estandarizar', 'Disciplina'], correct: 2 },
      { question: 'Cada cuanto debes aplicar 5S en tu area?', options: ['Una vez al mes', 'Solo cuando te lo pidan', 'Todos los dias', 'Al inicio del turno solamente'], correct: 2 },
    ],
    9: [
      { question: 'El horario de entrada es estricto. Si llegas tarde:', options: ['No pasa nada', 'Se registra como retardo', 'Te descuentan el dia completo', 'Puedes recuperar el tiempo'], correct: 1 },
      { question: 'El uso de celular en area de produccion esta:', options: ['Permitido en silencio', 'Prohibido', 'Permitido en descanso', 'A criterio del supervisor'], correct: 1 },
      { question: 'Si necesitas faltar al trabajo debes:', options: ['Solo no ir', 'Avisar a un compañero', 'Avisar a tu supervisor con anticipacion', 'Ir al dia siguiente'], correct: 2 },
      { question: 'El uniforme debe usarse:', options: ['Solo si quieres', 'Siempre en horario de trabajo', 'Solo en produccion', 'Solo cuando hay visitas'], correct: 1 },
      { question: 'Las amonestaciones escritas se guardan en:', options: ['Ningun lado', 'Tu expediente personal', 'Solo en papel', 'La memoria del supervisor'], correct: 1 },
    ],
    15: [
      { question: 'Si ocurre un accidente de trabajo, lo primero es:', options: ['Seguir trabajando', 'Avisar al supervisor inmediatamente', 'Esperar al final del turno', 'Resolverlo solo'], correct: 1 },
      { question: 'El equipo de proteccion personal (EPP) debe usarse:', options: ['Solo si tu quieres', 'Siempre que sea requerido en tu area', 'Solo cuando hay auditoria', 'Una vez al dia'], correct: 1 },
      { question: 'En caso de simulacro de evacuacion debes:', options: ['Quedarte en tu lugar', 'Seguir la ruta de evacuacion', 'Salir corriendo por donde puedas', 'Esperar instrucciones del director'], correct: 1 },
      { question: 'CMSH significa:', options: ['Control de Materiales de Seguridad', 'Comision Mixta de Seguridad e Higiene', 'Centro de Manejo Seguro de Herramientas', 'Comite de Mejora en Salud'], correct: 1 },
      { question: 'Si ves una condicion peligrosa en planta:', options: ['No es tu responsabilidad', 'La reportas al supervisor', 'La arreglas tu solo', 'Esperas a que alguien mas la vea'], correct: 1 },
    ],
    16: [
      { question: 'Tu puesto reporta directamente a:', options: ['Al director general', 'A tu supervisor de area', 'A recursos humanos', 'A nadie'], correct: 1 },
      { question: 'Si no entiendes una instruccion de trabajo, debes:', options: ['Intentar hacerlo como puedas', 'Preguntarle a un compañero', 'Pedirle a tu supervisor que te explique de nuevo', 'Ignorar la instruccion'], correct: 2 },
      { question: 'Las actividades de tu puesto estan definidas en:', options: ['Ningun documento', 'La descripcion de puesto', 'Solo lo que diga el supervisor', 'Lo que tu creas conveniente'], correct: 1 },
      { question: 'Si terminas tus actividades antes de tiempo debes:', options: ['Sentarte a esperar', 'Avisar a tu supervisor para ver que mas puedes hacer', 'Usar el celular', 'Salir temprano'], correct: 1 },
      { question: 'Tu periodo de prueba dura:', options: ['1 semana', '15 dias', '21 dias habiles', '1 mes'], correct: 2 },
    ],
  };
  return quizzes[moduleId] || [];
}
