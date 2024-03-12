/** @type {import('aegir').PartialOptions} */
export default {
  lint: {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*', 'test/**/*.js']
  },
  dependencyCheck: {
    ignore: [
      // .jsx files aren't checked properly.
      'multiformats',

      'react-dom',

      // required by webpack
      'webpack-cli',
      'webpack-dev-server',
      'babel-loader',
      'style-loader',
      'css-loader'
    ],
    productionIgnorePatterns: [
      'webpack.config.js',
      '.aegir.js',
      '/tests',
      'dist'
    ]
  }
}
