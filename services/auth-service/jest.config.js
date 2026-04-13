module.exports = {
  displayName: 'auth-service',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/auth-service',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/migrations/**',
    '!scripts/**',
    '!**/main.ts',
    '!**/migrate.ts',
    '!**/*.module.ts',
    '!**/*.config.{ts,js}',
  ],
};
