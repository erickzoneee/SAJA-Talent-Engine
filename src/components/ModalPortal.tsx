import { createPortal } from 'react-dom';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.22 — Toda ventana a pantalla completa (`fixed inset-0`) tiene que colgar
// de <body>.
//
// Si se deja dentro de un `.glass-card`, su `backdrop-filter: blur()` crea un
// BLOQUE CONTENEDOR y el `position: fixed` deja de referirse a la pantalla:
// se ancla al panel. La ventana sale corrida, mas alta que el panel, y lo
// primero que se pierde es la barra de opciones de arriba ("aparecen
// recortadas las opciones"). Con el portal vuelve a ocupar la pantalla
// completa en cualquier modulo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
