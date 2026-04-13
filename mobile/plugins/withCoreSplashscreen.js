const path = require('path');
const { withAppBuildGradle, withProjectBuildGradle, withSettingsGradle } =
  require('@expo/config-plugins');

/**
 * expo-splash-screen >=31.x ships a pre-built AAR via local-maven-repo instead
 * of compiling from source. expo-modules-autolinking does not wire this up
 * correctly in pnpm workspaces, so SplashScreenManager is unresolved at compile
 * time.
 *
 * This plugin:
 *  1. Adds the local-maven-repo to android repositories (both build.gradle and
 *     settings.gradle patterns are handled — RN <0.73 uses allprojects, >=0.73
 *     may use dependencyResolutionManagement in settings.gradle).
 *  2. Adds the expo-splash-screen AAR as an explicit app dependency.
 *  3. Ensures androidx.core:core-splashscreen is present (required for theme attrs).
 */

const SPLASH_VERSION = '31.0.13';
const SPLASH_ARTIFACT = `host.exp.exponent:expo.modules.splashscreen:${SPLASH_VERSION}`;
const CORE_SPLASH_ARTIFACT = 'androidx.core:core-splashscreen:1.0.1';
const MARKER = '// expo-splash-screen local AAR';

function getMavenRepoPath() {
  const pkgJsonPath = require.resolve('expo-splash-screen/package.json');
  return path.join(path.dirname(pkgJsonPath), 'local-maven-repo');
}

/** Injects into `allprojects { repositories { ... } }` in project build.gradle */
function withSplashMavenRepoBuildGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) return config;

    const repoEntry = `        maven { url '${getMavenRepoPath()}' } ${MARKER}`;
    // Match the repositories block inside allprojects
    config.modResults.contents = config.modResults.contents.replace(
      /(allprojects\s*\{(?:[^{}]|\{[^{}]*\})*repositories\s*\{)/s,
      `$1\n${repoEntry}`
    );
    return config;
  });
}

/** Injects into `dependencyResolutionManagement { repositories { ... } }` in settings.gradle */
function withSplashMavenRepoSettingsGradle(config) {
  return withSettingsGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) return config;

    const repoEntry = `        maven { url '${getMavenRepoPath()}' } ${MARKER}`;
    if (config.modResults.contents.includes('dependencyResolutionManagement')) {
      config.modResults.contents = config.modResults.contents.replace(
        /(dependencyResolutionManagement\s*\{(?:[^{}]|\{[^{}]*\})*repositories\s*\{)/s,
        `$1\n${repoEntry}`
      );
    }
    return config;
  });
}

/** Adds the AAR and core-splashscreen as app dependencies */
function withSplashScreenDependency(config) {
  return withAppBuildGradle(config, (config) => {
    let { contents } = config.modResults;

    if (!contents.includes('expo.modules.splashscreen')) {
      contents = contents.replace(
        /dependencies \{/,
        `dependencies {\n    implementation "${SPLASH_ARTIFACT}"`
      );
    }

    if (!contents.includes('core-splashscreen')) {
      contents = contents.replace(
        /dependencies \{/,
        `dependencies {\n    implementation "${CORE_SPLASH_ARTIFACT}"`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = (config) => {
  config = withSplashMavenRepoBuildGradle(config);
  config = withSplashMavenRepoSettingsGradle(config);
  config = withSplashScreenDependency(config);
  return config;
};
