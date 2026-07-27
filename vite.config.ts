import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 127.0.0.1 em vez de localhost: o padrão do Vite escuta só em ::1, o que
    // quebra clientes que resolvem localhost para IPv4.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
