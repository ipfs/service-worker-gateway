/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import esbuild from 'esbuild'

const copyPublicFiles = async () => {
  const srcDir = path.resolve('public')
  const destDir = path.resolve('dist')

  // Ensure the destination directory exists
  await fs.mkdir(destDir, { recursive: true })

  // Read all files in the source directory
  const files = await fs.readdir(srcDir)

  await Promise.all(
    files.map(async (file) => {
      const srcFile = path.join(srcDir, file)
      const destFile = path.join(destDir, file)
      await fs.copyFile(srcFile, destFile)
      console.log(`${file} copied to dist folder.`)
    })
  )
}

function gitRevision () {
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
 * Inject the dist/index.js and dist/index.css into the dist/index.html file
 *
 * @param {esbuild.Metafile} metafile - esbuild's metafile to extract output file names
 * @param {string} revision - Pre-computed Git revision string
 */
const injectAssets = async (metafile, revision) => {
  const htmlFilePath = path.resolve('dist/index.html')
  const outputs = metafile.outputs

  // Get the built JS and CSS filenames
  const scriptFile = Object.keys(outputs).find(file => file.endsWith('.js') && file.includes('ipfs-sw-index'))
  const cssFile = Object.keys(outputs).find(file => file.endsWith('.css') && file.includes('ipfs-sw-index'))

  if (!scriptFile || !cssFile) {
    console.error('Could not find the required assets in the metafile.')
    return
  }

  const scriptTag = `<script type="module" src="${path.basename(scriptFile)}"></script>`
  const linkTag = `<link rel="stylesheet" href="${path.basename(cssFile)}">`

  let htmlContent = await fs.readFile(htmlFilePath, 'utf8')
  htmlContent = htmlContent
    .replace('</head>', `${linkTag}</head>`)
    .replace('</body>', `${scriptTag}</body>`)
    .replace(/<%= GIT_VERSION %>/g, revision)

  await fs.writeFile(htmlFilePath, htmlContent)
  console.log(`Injected ${path.basename(scriptFile)} and ${path.basename(cssFile)} into index.html.`)
}

/**
 * Inject the ipfs-sw-first-hit.js into the ipfs-sw-first-hit.html file
 *
 * This was added when addressing an issue with redirects not preserving query parameters.
 *
 * The solution we're moving forward with is, instead of using 302 redirects with ipfs _redirects file, we are
 * using 200 responses with the ipfs-sw-first-hit.html file. That file will include the ipfs-sw-first-hit.js script
 * which will be injected into the index.html file, and handle the redirect logic for us.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 *
 * @param {esbuild.Metafile} metafile - esbuild's metafile to extract output file names
 * @param {string} revision - Pre-computed Git revision string
 */
const injectFirstHitJs = async (metafile, revision) => {
  const htmlFilePath = path.resolve('dist/ipfs-sw-first-hit.html')

  const scriptFile = Object.keys(metafile.outputs).find(file => file.endsWith('.js') && file.includes('ipfs-sw-first-hit'))

  if (!scriptFile) {
    console.error('Could not find the ipfs-sw-first-hit JS file in the metafile.')
    return
  }

  const scriptTag = `<script src="/${path.basename(scriptFile)}"></script>`
  let htmlContent = await fs.readFile(htmlFilePath, 'utf8')
  htmlContent = htmlContent
    .replace(/<%= GIT_VERSION %>/g, revision)
    .replace('</body>', `${scriptTag}</body>`)

  await fs.writeFile(htmlFilePath, htmlContent)
}

/**
 * Inject all ipfs-sw-*.html pages in the dist folder with CSS, git revision, and logo.
 *
 * @param {esbuild.Metafile} metafile - esbuild's metafile to extract output file names
 * @param {string} revision - Pre-computed Git revision string
 */
const injectHtmlPages = async (metafile, revision) => {
  const htmlFilePaths = await fs.readdir(path.resolve('dist'), { withFileTypes: true })
    .then(files => files.filter(file => file.isFile() && file.name.startsWith('ipfs-sw-') && file.name.endsWith('.html') && !file.name.includes('first-hit')))
    .then(files => files.map(file => path.resolve('dist', file.name)))

  for (const htmlFilePath of htmlFilePaths) {
    // find the -index-*.css file in the metafile results
    const cssFile = Object.keys(metafile.outputs).find(file => file.endsWith('.css') && file.includes('ipfs-sw-index'))

    if (!cssFile) {
      console.error('Could not find the ipfs-sw-index CSS file in the metafile.')
      return
    }

    const logoFile = Object.keys(metafile.outputs).find(file => file.endsWith('.svg') && file.includes('ipfs-sw-ipfs-logo'))

    if (!logoFile) {
      console.error('Could not find the ipfs-sw-ipfs-logo SVG file in the metafile.')
      return
    }

    const cssTag = `<link rel="stylesheet" href="/${path.basename(cssFile)}">`

    let htmlContent = await fs.readFile(htmlFilePath, 'utf8')
    htmlContent = htmlContent
      .replace(/<%= CSS_STYLES %>/g, cssTag)
      .replace(/<%= IPFS_LOGO_PATH %>/g, logoFile.replace('dist/', '/'))
      .replace(/<%= GIT_VERSION %>/g, revision)

    await fs.writeFile(htmlFilePath, htmlContent)
  }
}

/**
 * Asynchronously modify the _redirects file by appending entries for all files
 * in the dist folder except for index.html, _redirects, and _kubo_redirects.
 */
const modifyRedirects = async () => {
  const redirectsFilePath = path.resolve('dist/_redirects')
  const redirectsContent = await fs.readFile(redirectsFilePath, 'utf8')
  const distFiles = await fs.readdir(path.resolve('dist'))
  const files = distFiles.filter(file => !['_redirects', 'index.html', '_kubo_redirects'].includes(file))
  const lines = redirectsContent.split('\n')
  files.forEach(file => {
    lines.push(`/*/${file} /${file}`)
  })
  await fs.writeFile(redirectsFilePath, lines.join('\n'))
}

/**
 * Plugin to ensure the service worker has a consistent name.
 *
 * @type {esbuild.Plugin}
 */
const renameSwPlugin = {
  name: 'rename-sw-plugin',
  setup (build) {
    build.onEnd(async () => {
      const outdir = path.resolve('dist')
      const files = await fs.readdir(outdir)

      await Promise.all(
        files.map(async file => {
          if (file.startsWith('ipfs-sw-sw-')) {
            const extension = file.slice(file.indexOf('.'))
            const oldPath = path.join(outdir, file)
            const newPath = path.join(outdir, `ipfs-sw-sw${extension}`)
            await fs.rename(oldPath, newPath)
            console.log(`Renamed ${file} to ipfs-sw-sw${extension}`)
            if (extension === '.js') {
              const contents = await fs.readFile(newPath, 'utf8')
              const newContents = contents.replace(/sourceMappingURL=.*\.js\.map/, 'sourceMappingURL=ipfs-sw-sw.js.map')
              await fs.writeFile(newPath, newContents)
            }
          }
        })
      )
    })
  }
}

/**
 * Plugin to modify built files by running post-build tasks.
 *
 * @type {esbuild.Plugin}
 */
const modifyBuiltFiles = {
  name: 'modify-built-files',
  setup (build) {
    build.onEnd(async (result) => {
      // Cache the Git revision once
      const revision = gitRevision()

      // Run copyPublicFiles first to make sure public assets are in place
      await copyPublicFiles()

      // Run injection tasks concurrently since they modify separate files
      await Promise.all([
        injectAssets(result.metafile, revision),
        injectFirstHitJs(result.metafile, revision),
        injectHtmlPages(result.metafile, revision)
      ])

      // Modify the redirects file last
      await modifyRedirects()
    })
  }
}

/**
 * Creates a plugin that excludes files with the given extensions.
 *
 * @param {string[]} extensions - The extension strings to exclude (e.g. ['.eot?#iefix'])
 * @returns {esbuild.Plugin} - An esbuild plugin.
 */
const excludeFilesPlugin = (extensions) => ({
  name: 'exclude-files',
  setup (build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (extensions.some(ext => args.path.endsWith(ext))) {
        return { path: args.path, namespace: 'exclude', external: true }
      }
    })
  }
})

/**
 * @type {esbuild.BuildOptions}
 */
export const buildOptions = {
  entryPoints: ['src/index.tsx', 'src/sw.ts', 'src/ipfs-sw-first-hit.ts'],
  bundle: true,
  outdir: 'dist',
  loader: {
    '.js': 'jsx',
    '.css': 'css',
    '.svg': 'file'
  },
  minify: true,
  sourcemap: true,
  metafile: true,
  splitting: false,
  target: ['es2020'],
  format: 'esm',
  entryNames: 'ipfs-sw-[name]-[hash]',
  assetNames: 'ipfs-sw-[name]-[hash]',
  plugins: [renameSwPlugin, modifyBuiltFiles, excludeFilesPlugin(['.eot?#iefix', '.otf', '.woff', '.woff2'])]
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
  try {
    await ctx.rebuild()
    console.log('Build completed successfully.')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
  await ctx.dispose()
}

if (watchRequested) {
  await buildAndWatch()
}

if (serveRequested) {
  const { port } = await ctx.serve({
    servedir: 'dist',
    port: 8345,
    host: 'localhost'
  })
  console.info(`Listening on http://localhost:${port}`)
}
