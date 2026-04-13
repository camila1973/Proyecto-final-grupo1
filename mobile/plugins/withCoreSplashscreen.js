const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Ensures androidx.core:core-splashscreen is present in android/app/build.gradle.
 *
 * expo-splash-screen ~0.29.x generates resources that reference Theme.SplashScreen
 * and its attributes (windowSplashScreenBackground, etc.) which are defined in
 * core-splashscreen, but does not always add the dependency itself.
 */
module.exports = (config) =>
  withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('core-splashscreen')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies \{/,
        'dependencies {\n    implementation "androidx.core:core-splashscreen:1.0.1"'
      );
    }
    return config;
  });
