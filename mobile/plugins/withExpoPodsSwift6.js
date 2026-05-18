const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# expo-pods-swift6';
const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      if t.name.start_with?('Expo')
        t.build_configurations.each do |bc|
          bc.build_settings['SWIFT_VERSION'] = '6.0'
        end
      end
    end
`;

module.exports = function withExpoPodsSwift6(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) return cfg;

      const patched = contents.replace(
        /(react_native_post_install\([\s\S]*?\)\s*)(\n\s*end)/,
        `$1\n${SNIPPET}$2`
      );
      if (patched === contents) {
        throw new Error(
          'withExpoPodsSwift6: could not locate react_native_post_install block in Podfile'
        );
      }
      fs.writeFileSync(podfilePath, patched);
      return cfg;
    },
  ]);
};
