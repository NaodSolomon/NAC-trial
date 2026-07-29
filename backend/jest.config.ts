import type { Config } from 'jest';

const config: Config = {
  displayName: 'unit',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'modules/**/services/*.ts',
    'modules/donations/gateways/*.ts',
    'common/guards/*.ts',
    'common/pipes/*.ts',
    'config/env.validation.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 45,
      functions: 50,
      lines: 55,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',
};

export default config;
