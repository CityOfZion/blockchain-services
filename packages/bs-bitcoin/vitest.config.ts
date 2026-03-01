import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    setupFiles: ['dotenv/config'],
    testTimeout: 60000,
  },
})
