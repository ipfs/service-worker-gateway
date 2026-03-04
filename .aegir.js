/** @type {import('aegir').PartialOptions} */
export default {
  test: {
    files: [
      'test/**/*.spec.ts'
    ]
  },
  lint: {
    files: [
      'src/**/*.[jt]s',
      'src/**/*.[jt]sx',
      'test/**/*.[jt]s',
      'test/**/*.[jt]sx',
      'test-conformance/**/*.[jt]s',
      'test-e2e/**/*.[jt]s',
      './*.[jt]s'
    ]
  },
  dependencyCheck: {
    ignore: [
      // .jsx files aren't checked properly
      'react-dom',
      'react',

      // preact is substituted for react at build time
      'preact',

      // .css deps aren't checked properly
      'ipfs-css',
      'tachyons',

      // playwright dependencies
      'http-server',

      // package.json or playwright.config.js deps
      'wait-on',

      // used in scripts
      'cross-env',

      // used in cloudflare snippets
      '@cloudflare/workers-types'
    ],
    productionIgnorePatterns: [
      'webpack.config.js',
      'playwright.config.js',
      'test-conformance',
      'test-e2e',
      '.aegir.js',
      '/test',
      'dist',
      'build.js',
      '/benchmark'
    ]
  }
}
