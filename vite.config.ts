import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'serve' ? '/' : '/SAJA-Talent-Engine/',
  // El preview de Claude asigna el puerto via PORT cuando el 5173 esta ocupado.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
}))
