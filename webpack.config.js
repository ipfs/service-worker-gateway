import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import CompressionPlugin from 'compression-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import webpack from 'webpack'
import BundleAnalyzerPlugin from 'webpack-bundle-analyzer'
import { merge } from 'webpack-merge'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * HMR/Live Reloading broken after Webpack 5 rc.0 -> rc.1 update
 * https://github.com/webpack/webpack-dev-server/issues/2758
 *
 * target: 'web' for the moment under your development mode.
 */

const paths = {
  // Source files
  src: path.resolve(__dirname, './src'),
  testSrc: path.resolve(__dirname, './tests'),
  testBuild: path.resolve(__dirname, './test-build'),

  // Production build files
  build: path.resolve(__dirname, './dist'),

  // Static files that get copied to build folder
  public: path.resolve(__dirname, './public')
}

/**
 * @type {import('webpack').Configuration}
 */
const prod = {
  mode: 'production',
  devtool: 'inline-source-map',
  output: {
    path: paths.build,
    publicPath: '/',
    filename: '[name].js'
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  // fix: https://github.com/webpack/webpack-dev-server/issues/2758
  target: 'browserslist',
  plugins: [
    {
      apply (compiler) {
        // allows users to load HTML page via filesystem in browser.
        compiler.hooks.compilation.tap('usePageRelativeLinks', (compilation) => {
          HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync('usePageRelativeLinks', (data, cb) => {
            // Manipulate the content
            data.assetTags.scripts = data.assetTags.scripts.map((script) => {
              script.attributes.src = script.attributes.src.replace(/^\//, '')
              return script
            })

            // Tell webpack to move on
            cb(null, data)
          })
        })
      }
    },
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|svg)$/,
      exclude: /.map$/,
      compressionOptions: {
        level: 9,
        numiterations: 15,
        minRatio: 0.8
      },
      deleteOriginalAssets: true
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all'
        }
      }
    }
  }
}

/**
 * @type {import('webpack').Configuration}
 */
const dev = {
  // Set the mode to development or production
  mode: 'development',

  // Control how source maps are generated
  devtool: 'inline-source-map',

  // Where webpack outputs the assets and bundles
  output: {
    path: paths.build,
    filename: '[name].bundle.js',
    publicPath: '/'
  },

  // Spin up a server for quick development
  devServer: {
    historyApiFallback: true,
    static: paths.build,
    open: true,
    compress: true,
    // Only update what has changed on hot reload
    hot: true,
    port: 3000,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET'
    },
    allowedHosts: ['helia-sw-gateway.localhost', 'localhost']
  },

  plugins: [
    // Only update what has changed on hot reload
    new webpack.HotModuleReplacementPlugin()
  ]
}

/**
 * @type {import('webpack').Configuration}
 */
const test = {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: paths.testBuild,
    filename: 'tests.js'
  },
  entry: {
    tests: readdirSync(paths.testSrc).filter(function (file) {
      return file.match(/.*\.ts$/)
    }).map(function (file) {
      return path.join(paths.testSrc, file)
    })
  }
}

/**
 * @type {import('webpack').Configuration}
 */
const common = {
// Where webpack looks to start building the bundle
  entry: {
    main: paths.src + '/index.tsx',
    sw: paths.src + '/sw.ts'
  },

  // Customize the webpack build process
  plugins: [
    // Copies files from target to destination folder
    new CopyWebpackPlugin({
      patterns: [
        {
          from: `${paths.public}/_redirects`,
          noErrorOnMissing: false
        }
      ]
    }),

    // fixes Module not found: Error: Can't resolve 'stream' in '.../node_modules/nofilter/lib'
    new NodePolyfillPlugin(),
    // Note: stream-browserify has assumption about `Buffer` global in its
    // dependencies causing runtime errors. This is a workaround to provide
    // global `Buffer` until https://github.com/isaacs/core-util-is/issues/29
    // is fixed.
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),

    // Generates an HTML file from a template
    // Generates deprecation warning: https://github.com/jantimon/html-webpack-plugin/issues/1501
    new HtmlWebpackPlugin({
      title: 'Helia service worker gateway',
      favicon: paths.public + '/favicon.ico',
      template: paths.public + '/index.html', // template file
      filename: 'index.html', // output file,
      minify: false
    }),

    new webpack.DefinePlugin({
      window: 'globalThis' // attempt to naively replace all "window" keywords with "globalThis"
    }),
    new webpack.EnvironmentPlugin({
      BASE_URL: process.env.BASE_URL ?? 'helia-sw-gateway.localhost'
    })
  ],

  // Determine how modules within the project are treated
  module: {
    rules: [
      // JavaScript: Use Babel to transpile JavaScript files
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-typescript',
              [
                '@babel/preset-env',
                {
                  targets: {
                    esmodules: true
                  }
                }
              ],
              '@babel/preset-react'
            ]
          }
        }
      },

      // Images: Copy image files to build folder
      { test: /\.(?:ico|gif|png|jpg|jpeg)$/i, type: 'asset/resource' },

      // Fonts and SVGs: Inline files
      { test: /\.(woff(2)?|eot|ttf|otf|svg|)$/, type: 'asset/inline' },

      { test: /\.(css)$/, use: ['style-loader', 'css-loader'] }
    ]
  },

  resolve: {
    modules: [paths.src, 'node_modules'],
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },

  // fix: https://github.com/webpack/webpack-dev-server/issues/2758
  target: 'web',

  devtool: 'source-map',
  stats: {
    errorDetails: true,
    children: true
  },
  experiments: {
    topLevelAwait: true
  }
}

export default (cmd) => {
  const production = cmd.production
  let config = prod
  if (cmd.test) {
    config = test
    const testConfig = merge(common, test)
    testConfig.entry = test.entry
    return testConfig
  } else if (cmd.analyze) {
    config = prod
    prod.plugins.push(
      new BundleAnalyzerPlugin.BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'report.html',
        openAnalyzer: true
      })
    )
  } else if (!production) {
    config = dev
  }

  return merge(common, config)
}
