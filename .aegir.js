import { readFile } from 'fs/promises'
import { copy } from 'esbuild-plugin-copy'

// Define paths
const paths = {
  src: 'dist-tsc',
  public: 'public',
  dist: 'dist-esbuild'
}

/**
 * @type {import ('esbuild').Plugin}
 */
export const CSSMinifyPlugin = {
    name: "CSSMinifyPlugin",
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
            const f = await readFile(args.path)
            const css = await transform(f, { loader: "css", minify: true })
            return { loader: "text", contents: css.code }
        })
    }
}
// Copy plugin configuration
const copyPlugin = copy({
  assets: {
    from: [`${paths.public}/_redirects`, `${paths.public}/favicon.ico`, `${paths.public}/index.html`, `${paths.public}/**/*.svg`, `${paths.public}/**/*.css`],
    to: ['./public']
  }
})

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    config: {
      entryPoints: [`${paths.src}/src/index.jsx`, `${paths.src}/src/sw.js`],
      bundle: true,
      splitting: true,
      format: 'esm',
      outdir: paths.dist,
      loader: {
        '.svg': 'dataurl'
      },
      chunkNames: 'ipfs-sw-[name]',
      minify: true,
      sourcemap: true,
      target: 'esnext',
      plugins: [copyPlugin],
      define: { 'process.env.NODE_ENV': '"production"' }
    }
  },
  test: {
    files: ['test/node.ts']
  },
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
