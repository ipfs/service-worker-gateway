import { readFile } from "fs/promises"

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

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    config: {
      // TSC is done first, so inputs to esbuild is dist/src/*
      entryPoints: ['dist/src/index.jsx', 'dist/src/sw.js'],
      // outfile: null,
      outdir: 'dist',
      // minify: true,
      chunkNames: 'ipfs-sw-[name]',
      splitting: true,
      loader: {
        '.svg': 'dataurl'
      },
      format: 'esm',
      plugins: [CSSMinifyPlugin]
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
