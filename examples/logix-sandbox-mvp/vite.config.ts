import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { logixSandboxKernelPlugin } from '@logix/sandbox/vite'
import { jsToTsResolver } from '../../scripts/vite-js-to-ts-resolver'

export default defineConfig({
  plugins: [jsToTsResolver(), react(), tailwindcss(), logixSandboxKernelPlugin()],
})
