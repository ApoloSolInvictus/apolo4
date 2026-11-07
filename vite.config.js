import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  input: 'electron.html',
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
})
