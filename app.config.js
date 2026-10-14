const baseConfig = require('./app.json');

const enableApns = process.env.EXPO_ENABLE_APNS === 'true';
const basePlugins = baseConfig.expo.plugins || [];
const plugins = basePlugins;

const baseBackgroundModes = baseConfig.expo.ios?.infoPlist?.UIBackgroundModes || [];
const backgroundModes = enableApns
  ? baseBackgroundModes
  : baseBackgroundModes.filter((mode) => mode !== 'remote-notification');

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    plugins,
    ios: {
      ...baseConfig.expo.ios,
      infoPlist: {
        ...baseConfig.expo.ios?.infoPlist,
        UIBackgroundModes: backgroundModes,
      },
    },
  },
};
