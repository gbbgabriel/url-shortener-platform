const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['**/test/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    '!apps/**/*.spec.ts',
    '!apps/**/*.integration.spec.ts',
    '!apps/**/*.e2e.spec.ts',
    '!apps/**/main.ts',
    '!libs/**/*.spec.ts',
  ],
  coverageDirectory: './coverage/integration',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Para evitar conflitos de banco
  forceExit: true,
  detectOpenHandles: true,
};
