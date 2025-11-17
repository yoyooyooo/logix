import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const SpeckitKanbanApiProxyTarget = process.env.SPECKIT_KANBAN_API_PROXY_TARGET ?? 'http://127.0.0.1:5510'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: SpeckitKanbanApiProxyTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})

