import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Workspace packages export TS sources (not prebuilt dist). Excluding them from optimizeDeps
  // makes Vite treat them as source modules so changes are reflected during dev.
  optimizeDeps: {
    exclude: ["@logix/core", "@logix/react", "@logix/devtools-react"],
  },
  server: {
    fs: {
      // Allow Vite to read files outside this example folder (workspace packages).
      allow: [path.resolve(__dirname, "..", "..")],
    },
  },
})
