// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Impresion via iframe oculto: no abre ventanas emergentes, por lo que
// funciona aunque el navegador bloquee popups (causa tipica de que el boton
// "Imprimir" no haga nada).
//
// El iframe es UNICO y se reutiliza entre impresiones — nunca se elimina.
// En Safari window.print() regresa de inmediato y afterprint se dispara
// antes de que el usuario cierre el dialogo; si el iframe se eliminara con
// un timer, el dialogo quedaria apuntando a un frame muerto y la hoja
// saldria en blanco. Un iframe de 0x0 permanente no cuesta nada y evita
// toda esa carrera.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { DocTemplate } from './documentsV2';

/** Escapa texto libre (nombres, domicilios, horarios) antes de insertarlo
 *  en el HTML de impresion; sin esto un "<" capturado por RH se comeria el
 *  resto del renglon en el documento impreso. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Impresion de documentos firmables (v2.13) ──────────────────────────────
// Compartida entre Contratacion (5 documentos de ingreso) y Egreso (renuncia
// voluntaria). Si el documento es `plain` (la renuncia), NO lleva membrete ni
// nombre de la empresa: es la carta que el propio colaborador escribe.
export function printSignedDocument(doc: DocTemplate, companyName: string): void {
  const parrafosHtml = doc.parrafos
    .map((p) =>
      p === 'A T E N T A M E N T E'
        ? `<p class="centrado">${escapeHtml(p)}</p>`
        : `<p>${escapeHtml(p)}</p>`,
    )
    .join('');
  const encabezado = doc.plain ? '' : `<div class="empresa">${escapeHtml(companyName)}</div>`;
  printHtmlDocument(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.titulo)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; margin: 56px; color: #111; }
    .empresa { text-align: center; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #444; }
    h1 { font-size: 19px; text-align: center; text-transform: uppercase; margin: 8px 0 4px; }
    .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 28px; }
    p { font-size: 13px; line-height: 1.75; text-align: justify; margin: 10px 0; }
    .centrado { text-align: center; letter-spacing: 2px; margin: 28px 0; }
    .firmas { display: flex; justify-content: space-between; gap: 60px; margin-top: 100px; }
    .firma { flex: 1; text-align: center; font-size: 12px; border-top: 1px solid #111; padding-top: 8px; }
  </style></head><body>
    ${encabezado}
    <h1>${escapeHtml(doc.titulo)}</h1>
    <div class="meta">${escapeHtml(doc.cuando)} · ${escapeHtml(doc.tantos)}</div>
    ${parrafosHtml}
    <div class="firmas">
      <div class="firma">${escapeHtml(doc.firmaIzquierda)}<br/>Nombre y firma</div>
      <div class="firma">${escapeHtml(doc.firmaDerecha)}<br/>Nombre y firma</div>
    </div>
  </body></html>`);
}

let printFrame: HTMLIFrameElement | null = null;
let printing = false;

export function printHtmlDocument(fullHtml: string): void {
  // Candado de reentrada: el dialogo tarda ~300ms en aparecer y un segundo
  // click en ese lapso abriria un segundo dialogo identico
  if (printing) return;

  if (!printFrame || !printFrame.isConnected) {
    printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
  }

  const doc = printFrame.contentDocument ?? printFrame.contentWindow?.document;
  const win = printFrame.contentWindow;
  if (!doc || !win) return;

  printing = true;
  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Pequena espera para que el iframe termine de renderizar antes del dialogo
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      // En Chrome/Firefox print() bloquea hasta cerrar el dialogo; en Safari
      // regresa de inmediato — el margen extra absorbe el doble click
      setTimeout(() => {
        printing = false;
      }, 1000);
    }
  }, 300);
}
