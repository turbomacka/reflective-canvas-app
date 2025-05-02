// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Gör så att '@/...' pekar på mappen src
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react({
      // Om du använder .jsx/.tsx-filer
      jsxRuntime: 'automatic',
    }),
  ],
  // Valfria inställningar du kanske redan har:
  // server: {
  //   port: 3000,
  // },
  // build: {
  //   outDir: 'dist',
  // },
})
