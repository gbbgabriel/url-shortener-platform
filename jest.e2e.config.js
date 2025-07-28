module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/libs/$1/src',
    '^@libs/(.*)$': '<rootDir>/libs/$1/src',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.setup.ts'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'apps/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    '!apps/**/*.spec.ts',
    '!apps/**/main.ts',
    '!libs/**/*.spec.ts',
  ],
  coverageDirectory: './coverage/e2e',
  forceExit: true,
  detectOpenHandles: true,
};
