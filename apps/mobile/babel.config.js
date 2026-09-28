// NativeWind v5 needs no Babel preset (D-015); Expo's preset handles JSX and Reanimated.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
