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
 * Inject the dist/index.js and dist/index.css into the dist/index.html file
 *
 * @param {esbuild.Metafile} metafile
 */
const injectAssets = (metafile) => {
  const htmlFilePath = path.resolve('dist/index.html')

  // Extract the output file names from the metafile
  const outputs = metafile.outputs
  const scriptFile = Object.keys(outputs).find(file => file.endsWith('.js') && file.includes('ipfs-sw-index'))
  const cssFile = Object.keys(outputs).find(file => file.endsWith('.css') && file.includes('ipfs-sw-index'))

  const scriptTag = `<script type="module" src="${path.basename(scriptFile)}"></script>`
  const linkTag = `<link rel="stylesheet" href="${path.basename(cssFile)}">`

  // Read the index.html file
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf8')

  // Inject the link tag for CSS before the closing </head> tag
  htmlContent = htmlContent.replace('</head>', `${linkTag}</head>`)

  // Inject the script tag for JS before the closing </body> tag
  htmlContent = htmlContent.replace('</body>', `${scriptTag}</body>`)

  // Write the modified HTML back to the index.html file
  fs.writeFileSync(htmlFilePath, htmlContent)
  console.log(`Injected ${path.basename(scriptFile)} and ${path.basename(cssFile)} into index.html.`)
}

/**
 * We need the service worker to have a consistent name
 *
 * @type {esbuild.Plugin}
 */
const renameSwPlugin = {
  name: 'rename-sw-plugin',
  setup (build) {
    build.onEnd(() => {
      const outdir = path.resolve('dist')
      const files = fs.readdirSync(outdir)

      files.forEach(file => {
        if (file.startsWith('ipfs-sw-sw-')) {
          // everything after the dot
          const extension = file.slice(file.indexOf('.'))
          const oldPath = path.join(outdir, file)
          const newPath = path.join(outdir, `ipfs-sw-sw${extension}`)
          fs.renameSync(oldPath, newPath)
          console.log(`Renamed ${file} to ipfs-sw-sw${extension}`)
          if (extension === '.js') {
            // Replace sourceMappingURL with new path
            const contents = fs.readFileSync(newPath, 'utf8')
            const newContents = contents.replace(/sourceMappingURL=.*\.js\.map/, 'sourceMappingURL=ipfs-sw-sw.js.map')
            fs.writeFileSync(newPath, newContents)
          }
        }
      })
    })
  }
}

/**
 * @type {esbuild.Plugin}
 */
const modifyBuiltFiles = {
  name: 'modify-built-files',
  setup (build) {
    build.onEnd(async (result) => {
      copyPublicFiles()
      injectAssets(result.metafile)
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
  splitting: true,
  target: ['es2020'],
  format: 'esm',
  entryNames: 'ipfs-sw-[name]-[hash]',
  assetNames: 'ipfs-sw-[name]-[hash]',
  plugins: [renameSwPlugin, modifyBuiltFiles]
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
