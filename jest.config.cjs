module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/shared'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/client/', '/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(openid-client|oauth4webapi)/)'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
      diagnostics: { warnOnly: true }
    }]
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.ts'],
  testTimeout: 10000,
  maxWorkers: 1,
  cacheDirectory: '.jest-cache',
  collectCoverageFrom: [
    'server/**/*.ts',
    'shared/**/*.ts',
    '!server/__tests__/**',
    '!server/index.ts',
    '!server/vite.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};