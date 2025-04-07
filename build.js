/* eslint-disable no-console */
import { execSync } from 'node:child_process'
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

  // Inject the git revision into the index
  htmlContent = htmlContent.replace(/<%= GIT_VERSION %>/g, gitRevision())

  // Write the modified HTML back to the index.html file
  fs.writeFileSync(htmlFilePath, htmlContent)
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
 * @param {esbuild.Metafile} metafile
 */
const injectFirstHitJs = (metafile) => {
  const htmlFilePath = path.resolve('dist/ipfs-sw-first-hit.html')

  const scriptFile = Object.keys(metafile.outputs).find(file => file.endsWith('.js') && file.includes('ipfs-sw-first-hit'))
  const scriptTag = `<script src="/${path.basename(scriptFile)}"></script>`
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf8')
  htmlContent = htmlContent.replace(/<%= GIT_VERSION %>/g, gitRevision())
  htmlContent = htmlContent.replace('</body>', `${scriptTag}</body>`)
  fs.writeFileSync(htmlFilePath, htmlContent)
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
 * For every file in the dist folder except for _redirects, and ipfs-sw-first-hit.html, we need to make sure that
 * redirects from /{splat}/ipfs-sw-{asset}.css and /{splat}/ipfs-sw-{asset}.js are redirected to root /ipfs-sw-{asset}.css and /ipfs-sw-{asset}.js
 * respectively.
 *
 * This is only needed when hosting the `./dist` folder on cloudflare pages. When hosting with an IPFS gateway, the _redirects file should be replaced with the _kubo_redirects file
 */
const modifyRedirects = () => {
  const redirectsFilePath = path.resolve('dist/_redirects')
  const redirectsContent = fs.readFileSync(redirectsFilePath, 'utf8')
  // loop over all files in dist except for _redirects and ipfs-sw-first-hit.html
  const files = fs.readdirSync(path.resolve('dist')).filter(file => !['_redirects', 'index.html'].includes(file))
  const lines = redirectsContent.split('\n')
  files.forEach(file => {
    lines.push(`/*/${file} /${file}`)
  })

  fs.writeFileSync(redirectsFilePath, lines.join('\n'))
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
      injectFirstHitJs(result.metafile)
      modifyRedirects()
    })
  }
}

/**
 * @param {string[]} extensions - The extension of the imported files to exclude. Must match the fill ending path in the import(js) or url(css) statement.
 * @returns {esbuild.Plugin}
 */
const excludeFilesPlugin = (extensions) => ({
  name: 'exclude-files',
  setup (build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
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
