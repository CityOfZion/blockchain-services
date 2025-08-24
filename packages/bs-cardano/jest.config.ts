import { JestConfigWithTsJest } from 'ts-jest'
const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  verbose: true,
  bail: true,
  testMatch: ['<rootDir>/**/*.spec.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  detectOpenHandles: true,
  testTimeout: 30000,
}

export default config
