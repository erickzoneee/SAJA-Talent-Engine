import type { OnboardingModule } from '../types';

export function getDefaultOnboardingModules(): OnboardingModule[] {
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
