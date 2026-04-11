module.exports = {
  displayName: 'integration-service',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/integration-service',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/database/migrate.ts',
    '!src/database/database.provider.ts',
    '!src/database/database.types.ts',
    '!src/database/migrations/**',
  ],
};
