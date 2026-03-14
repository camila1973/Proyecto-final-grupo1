module.exports = {
  displayName: 'api-gateway',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/api-gateway',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: ['**/*.(t|j)s'],
};
