/** @type {import('aegir').PartialOptions} */
export default {
  test: { },
  lint: {
    files: [
      'src/**/*.[jt]s',
      'src/**/*.[jt]sx',
      'test/**/*.[jt]s',
      'test/**/*.[jt]sx',
      'test-e2e/**/*.[jt]s',
      './*.[jt]s'
    ]
  },
  dependencyCheck: {
    ignore: [
      // .jsx files aren't checked properly.
      'react-dom',

      // .css deps aren't checked properly.
      'ipfs-css',
      'tachyons',

      // playwright dependencies
      'http-server',

      // package.json or playwright.config.js deps
      'wait-on'
    ],
    productionIgnorePatterns: [
      'webpack.config.js',
      'playwright.config.js',
      'test-e2e',
      '.aegir.js',
      '/test',
      'dist',
      'build.js',
      'serve.js'
    ]
  }
}
