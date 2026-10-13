import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    setupFiles: ['dotenv/config', './vitest.setup.ts'],
    testTimeout: 60000,
  },
})
