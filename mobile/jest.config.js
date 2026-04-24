module.exports = {
  displayName: 'mobile',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|react-native-paper|@react-native|@react-native-community|expo|@expo|react-native-safe-area-context)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '../coverage/mobile',
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    'app/**/*.ts',
    'components/**/*.ts',
    'hooks/**/*.ts',
    'constants/**/*.ts',
  ],
};
