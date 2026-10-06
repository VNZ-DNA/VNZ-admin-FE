import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['components/**/*.test.{ts,tsx}', 'features/**/*.test.{ts,tsx}'],
  },
})
