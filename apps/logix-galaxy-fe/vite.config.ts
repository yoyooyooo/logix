import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { logixSandboxKernelPlugin } from '@logix/sandbox/vite'

const GalaxyApiProxyTarget = process.env.GALAXY_API_PROXY_TARGET ?? 'http://127.0.0.1:5500'

export default defineConfig({
  plugins: [react(), tailwindcss(), logixSandboxKernelPlugin()],
  server: {
    proxy: {
      '/api': {
        target: GalaxyApiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
