module.exports = {
  displayName: 'notification-service',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/notification-service',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
};
