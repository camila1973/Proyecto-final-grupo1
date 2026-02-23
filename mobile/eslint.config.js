// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Disable import/no-unresolved as Expo handles @ path aliases at runtime
      'import/no-unresolved': 'off',
    },
  },
]);
