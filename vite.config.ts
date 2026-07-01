import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  // Dominio propio saja.click (GitHub Pages con CNAME) → base en la raiz.
  base: '/',
}))
