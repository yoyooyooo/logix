import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { logixSandboxKernelPlugin } from '@logixjs/sandbox/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), logixSandboxKernelPlugin()],
})
