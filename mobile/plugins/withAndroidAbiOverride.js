const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Overrides Android ABI filters via `reactNativeArchitectures` in
 * gradle.properties when EAS_ABI_FILTER is set.
 *
 * Default RN builds compile native code for all four ABIs
 * (arm64-v8a, armeabi-v7a, x86, x86_64). For CI E2E we only need the
 * emulator's ABI, x86_64 — building the other three roughly quadruples
 * CMake/native-symbol work and was OOM-killing the Gradle daemon on the
 * 2-core/7 GB ubuntu-latest runner.
 *
 * No-op when EAS_ABI_FILTER is unset, so dev/local/production builds are
 * untouched. The CI workflow (and eas.json preview profile env) sets
 * EAS_ABI_FILTER=x86_64.
 */
module.exports = function withAndroidAbiOverride(config) {
  const override = process.env.EAS_ABI_FILTER;
  if (!override) return config;

  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'reactNativeArchitectures')
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: override,
    });
    return config;
  });
};
