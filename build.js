/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import esbuild from 'esbuild'

const copyPublicFiles = () => {
  const srcDir = path.resolve('public')
  const destDir = path.resolve('dist')

  // Ensure the destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  // Read all files in the source directory
  const files = fs.readdirSync(srcDir)

  // Copy each file to the destination directory
  files.forEach(file => {
    const srcFile = path.join(srcDir, file)
    const destFile = path.join(destDir, file)
    fs.copyFileSync(srcFile, destFile)
    console.log(`${file} copied to dist folder.`)
  })
}

/**
 * @type {esbuild.Plugin}
 */
const copyPublicFilesPlugin = {
  name: 'copy-public-files',
  setup (build) {
    build.onEnd(async (result) => {
      copyPublicFiles()
    })
  }
}

/**
 * @type {esbuild.BuildOptions}
 */
export const buildOptions = {
  entryPoints: ['src/index.tsx', 'src/sw.ts'],
  bundle: true,
  outdir: 'dist',
  loader: {
    '.js': 'jsx',
    '.css': 'css',
    '.eot': 'file',
    '.otf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.svg': 'file'
  },
  minify: true,
  sourcemap: true,
  metafile: true,
  splitting: false,
  target: ['es2020'],
  format: 'esm',
  entryNames: 'ipfs-sw-[name]',
  assetNames: 'ipfs-sw-[name]',
  plugins: [copyPublicFilesPlugin]
}

const ctx = await esbuild.context(buildOptions)

const buildAndWatch = async () => {
  try {
    await ctx.watch()

    process.on('exit', async () => {
      await ctx.dispose()
    })

    console.log('Watching for changes...')
    await ctx.rebuild()
    console.log('Initial build completed successfully.')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

const watchRequested = process.argv.includes('--watch')
const serveRequested = process.argv.includes('--serve')

if (!watchRequested && !serveRequested) {
  esbuild.build(buildOptions).then(result => {
    console.log('Build completed successfully.')
  }).catch(error => {
    console.error('Build failed:', error)
    process.exit(1)
  })
  await ctx.dispose()
}

if (watchRequested) {
  await buildAndWatch()
}

if (serveRequested) {
  const { host, port } = await ctx.serve({
    servedir: 'dist',
    port: 8345,
    host: 'localhost'
  })
  console.info(`Listening on http://${host}:${port}`)
}
