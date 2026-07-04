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

/** Escapa texto libre (nombres, domicilios, horarios) antes de insertarlo
 *  en el HTML de impresion; sin esto un "<" capturado por RH se comeria el
 *  resto del renglon en el documento impreso. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
