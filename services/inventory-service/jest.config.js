module.exports = {
  displayName: 'inventory-service',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/inventory-service',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: ['**/*.(t|j)s'],
};
