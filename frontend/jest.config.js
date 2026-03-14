module.exports = {
  displayName: 'frontend',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/frontend',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
};
