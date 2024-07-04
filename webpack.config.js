import { execSync } from 'child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import webpack from 'webpack'
import BundleAnalyzerPlugin from 'webpack-bundle-analyzer'
import { merge } from 'webpack-merge'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const splitChunks = {
  chunks: 'all',
  cacheGroups: {
    styles: {
      minChunks: 1,
      name: 'styles',
      test: /.+\.css/,
      chunks: 'initial',
      enforce: true
    },
    sw: {
      test: /[\\/]src[\\/]sw.js/,
      name: 'sw',
      priority: 100, // anything the sw needs should be in the sw chunk
      chunks: 'async'
    },
    reactVendor: {
      test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
      name: 'vendor-react',
      chunks: 'initial'
    }
  }
}

/**
 * HMR/Live Reloading broken after Webpack 5 rc.0 -> rc.1 update
 * https://github.com/webpack/webpack-dev-server/issues/2758
 *
 * target: 'web' for the moment under your development mode.
 */

const paths = {
  // Source files
  distTsc: path.resolve(__dirname, './dist-tsc/src'),
  devSrc: path.resolve(__dirname, './src'),
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
  devtool: 'source-map',
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  // fix: https://github.com/webpack/webpack-dev-server/issues/2758
  target: 'browserslist',
  plugins: [
    // TODO: re-enable this when we have a better solution for first-hit handling of page-relative links
    // {
    //   apply (compiler) {
    //     // allows users to load HTML page via filesystem in browser.
    //     compiler.hooks.compilation.tap('usePageRelativeLinks', (compilation) => {
    //       HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync('usePageRelativeLinks', (data, cb) => {
    //         // Manipulate the content
    //         data.assetTags.scripts = data.assetTags.scripts.map((script) => {
    //           script.attributes.src = script.attributes.src.replace(/^\//, '')
    //           return script
    //         })

    //         // Tell webpack to move on
    //         cb(null, data)
    //       })
    //     })
    //   }
    // }
  ],
  optimization: {
    innerGraph: true,
    mergeDuplicateChunks: false,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: 'all',
        terserOptions: {
          ie8: false,
          safari10: false,
          // ecma: 2020
          compress: {
            drop_console: true
          }
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        }
      })
    ],
    splitChunks
  }
}

/**
 * @type {import('webpack').Configuration}
 */
const dev = {
  // Set the mode to development or production
  mode: 'development',
  entry: {
    main: paths.devSrc + '/index.tsx'
  },

  // Control how source maps are generated
  devtool: 'inline-source-map',

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
    allowedHosts: ['swig.localhost', 'helia-sw-gateway.localhost', 'localhost']
  },

  plugins: [
    // Only update what has changed on hot reload
    new webpack.HotModuleReplacementPlugin()
  ],
  optimization: {
    splitChunks
  }
}

/**
 * Retrieves meaningful Git info about the current commit.
 *
 * @returns {string} A string representing the git revision info.
 */
const gitRevision = () => {
  try {
    const ref = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const sha = execSync('git rev-parse --short HEAD').toString().trim()

    try {
      // detect production build
      execSync('git fetch --force --depth=1 --quiet origin production')
      const latestProduction = execSync('git rev-parse remotes/origin/production').toString().trim()
      if (latestProduction.startsWith(sha)) {
        return `production@${sha}`
      }

      // detect staging build
      execSync('git fetch --force --depth=1 --quiet origin staging')
      const latestStaging = execSync('git rev-parse remotes/origin/staging').toString().trim()
      if (latestStaging.startsWith(sha)) {
        return `staging@${sha}`
      }
    } catch (_) { /* noop */ }

    return `${ref}@${sha}`
  } catch (_) {
    return `no-git-dirty@${new Date().getTime().toString()}`
  }
}

/**
 * @type {import('webpack').Configuration}
 */
const common = {
// Where webpack looks to start building the bundle
  entry: {
    main: paths.distTsc + '/index.jsx'
  },
  output: {
    path: paths.build,
    publicPath: '/',
    filename: 'ipfs-sw-[name]-[contenthash].js',
    chunkFilename: (pathData, _assetInfo) => {
      const name = pathData.chunk.name
      if (name === 'sw') {
        return 'ipfs-sw-[name].js'
      }
      return 'ipfs-sw-[name]-[contenthash].js'
    }
  },

  // Customize the webpack build process
  plugins: [
    // Copies files from target to destination folder
    new CopyWebpackPlugin({
      patterns: [
        {
          from: `${paths.public}/_redirects`,
          noErrorOnMissing: false
        },
        {
          from: `${paths.public}/manifest.json`,
          noErrorOnMissing: false
        },
        {
          from: `${paths.public}/icon-512.png`,
          noErrorOnMissing: false
        }
      ]
    }),

    // Generates an HTML file from a template
    // Generates deprecation warning: https://github.com/jantimon/html-webpack-plugin/issues/1501
    // TODO: replace with something like https://github.com/craftamap/esbuild-plugin-html ?
    new HtmlWebpackPlugin({
      excludeChunks: ['sw'],
      title: 'IPFS Service Worker Gateway',
      version: gitRevision(),
      favicon: paths.public + '/favicon.ico',
      template: paths.public + '/index.html', // template file
      filename: 'index.html', // output file,
      minify: false
    }),

    new webpack.DefinePlugin({
      window: 'globalThis' // attempt to naively replace all "window" keywords with "globalThis"
    }),

    new MiniCssExtractPlugin({
      filename: 'ipfs-sw-[name]-[contenthash].css',
      chunkFilename: 'ipfs-sw-[id]-[contenthash].css'
    })
  ],

  // Determine how modules within the project are treated
  module: {
    rules: [
      // aegir has already built the JS for us with tsc & esbuild
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

      // Inline SVGs
      { test: /\.(svg|)$/, type: 'asset/inline' },
      {
        test: /\.(sa|sc|c)ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: {
                // Exclude fonts from build
                filter: (url, resourcePath) => {
                  const fontRegex = /\.(otf|woff|woff2)/

                  if (url.search(fontRegex)) {
                    return false
                  }

                  return true
                }
              }
            }
          }
        ]
      }
    ]
  },

  resolve: {
    modules: [paths.distTsc, 'node_modules'],
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
      '.cjs': ['.cjs', '.cts'],
      '.mjs': ['.mjs', '.mts']
    }
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
  if (cmd.analyze) {
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
