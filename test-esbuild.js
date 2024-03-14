import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy'

// Define paths
const paths = {
  src: 'src',
  public: 'public',
  dist: 'dist-esbuild2'
}

// Copy plugin configuration
const copyPlugin = copy({
  assets: {
    from: [`${paths.public}/_redirects`, `${paths.public}/favicon.ico`, `${paths.public}/index.html`, `${paths.public}/**/*.svg`, `${paths.public}/**/*.css`],
    to: ['.']
  }
})

// Main build function
const build = async () => {
  // Build the main application
  await esbuild.build({
    entryPoints: [`${paths.src}/index.tsx`],
    // bundle: true,
    // splitting: true,
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
  })

  // Build the service worker
  await esbuild.build({
    entryPoints: [`${paths.src}/sw.ts`],
    bundle: true,
    outdir: paths.dist,
    chunkNames: 'ipfs-sw-[name]',
    splitting: false,
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: 'esnext',
    define: { 'process.env.NODE_ENV': '"production"' }
  })

  // Additional configurations like React vendor chunk splitting
  // might require custom logic or third-party tools as esbuild's
  // chunk splitting capabilities are not as extensive as Webpack's.
}

// eslint-disable-next-line no-console
build().catch((e) => console.error(e))
