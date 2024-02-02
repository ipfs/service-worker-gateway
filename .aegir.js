/** @type {import('aegir').PartialOptions} */
export default {
  lint: {
    files: ['src/**/*.ts', 'src/**/*.tsx']
  },
  dependencyCheck: {
    ignore: [
      // .jsx files aren't checked properly.
      'multiformats',

      'react-dom',

      // required by webpack but not explicitly
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
