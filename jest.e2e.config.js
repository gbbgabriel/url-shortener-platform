const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['**/test/e2e/**/*.spec.ts'],
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
  coverageDirectory: './coverage/e2e',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.setup.ts'],
  testTimeout: 45000,
  maxWorkers: 1, // Para evitar conflitos de porta/banco
  forceExit: true,
  detectOpenHandles: true,
};
