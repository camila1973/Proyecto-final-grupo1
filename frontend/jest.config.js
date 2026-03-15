module.exports = {
  displayName: 'frontend',
  preset: '../jest.preset.js',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  moduleNameMapper: {
    '^/.+\\.(svg|png|jpg|jpeg|gif|ico)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(svg|png|jpg|jpeg|gif|ico)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/fileMock.js',
  },
  coverageDirectory: '../coverage/frontend',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
};
