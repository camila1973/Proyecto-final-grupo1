module.exports = {
  displayName: 'search-service',
  ...require('../../jest.preset.js'),
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/search-service',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: ['**/*.(t|j)s'],
};
