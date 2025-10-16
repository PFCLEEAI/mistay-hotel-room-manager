module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Set webpack target to support modern ES features including dynamic imports
      webpackConfig.target = 'web';

      // Ensure output is ES6+ compatible
      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          dynamicImport: true,
          module: true,
        },
      };

      return webpackConfig;
    },
  },
};
