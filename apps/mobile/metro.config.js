// Metro: Expo defaults (monorepo-aware) + NativeWind's CSS pipeline (D-015).
// `inlineVariables: false` keeps the colour tokens as runtime CSS variables, so ThemeProvider can
// swap them (dark/light) on native too; inlining would bake the dark values into every class.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

module.exports = withNativewind(getDefaultConfig(__dirname), { inlineVariables: false });
