module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ensure the bundle targets environments with dynamic import support
      webpackConfig.target = ['web', 'es2020'];

      // Preserve existing output options while enabling dynamic imports explicitly
      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          ...(webpackConfig.output?.environment || {}),
          dynamicImport: true,
        },
      };

      return webpackConfig;
    },
  },
};
