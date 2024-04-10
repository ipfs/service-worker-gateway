/** @type {import('aegir').PartialOptions} */
export default {
  test: { },
  lint: {
    files: [
      'src/**/*.[jt]s',
      'src/**/*.[jt]sx',
      'test/**/*.[jt]s',
      'test/**/*.[jt]sx',
      'test-e2e/**/*.[jt]s'
    ]
  },
  dependencyCheck: {
    ignore: [
      // .jsx files aren't checked properly.
      'preact',

      // required by webpack
      'webpack-cli',
      'webpack-dev-server',
      'babel-loader',
      'style-loader',
      'css-loader'
    ],
    productionIgnorePatterns: [
      'webpack.config.js',
      'playwright.config.js',
      'test-e2e',
      '.aegir.js',
      '/test',
      'dist'
    ]
  }
}
