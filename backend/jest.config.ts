import type { Config } from 'jest';

const config: Config = {
  displayName: 'unit',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'modules/**/*.ts',
    'common/**/*.ts',
    'config/**/*.ts',
    'platform/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/index.ts',
    '!**/interfaces/**',
    '!**/entities/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 36,
      branches: 38,
      functions: 33,
      lines: 36,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',
};

export default config;
