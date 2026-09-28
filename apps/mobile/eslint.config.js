// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = (async () => {
  const { rtlConfig } = await import('@nujoom/config/eslint');
  return defineConfig([
    expoConfig,
    rtlConfig,
    { ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'expo-env.d.ts'] },
  ]);
})();
