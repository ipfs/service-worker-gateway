/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
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
 * Calculate SHA-256 hash of a file
 * 
 * @param {string} filePath - Path to the file
 * @returns {string} - Base64 encoded SHA-256 hash
 */
const calculateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath)
  const hashSum = crypto.createHash('sha256')
  hashSum.update(fileBuffer)
  return hashSum.digest('base64')
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

  // Calculate hashes for script and CSS files
  const scriptPath = scriptFile // The metafile outputs already contain absolute paths
  const cssPath = cssFile // The metafile outputs already contain absolute paths
  const scriptHash = calculateFileHash(scriptPath)
  const cssHash = calculateFileHash(cssPath)

  console.log(`Script hash (sha256): ${scriptHash}`)
  console.log(`CSS hash (sha256): ${cssHash}`)

  const scriptTag = `<script type="module" src="${path.basename(scriptFile)}"></script>`
  const linkTag = `<link rel="stylesheet" href="${path.basename(cssFile)}">`

  // Read the index.html file
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf8')

  // Update the CSP header with the calculated hashes
  const cspContent = `default-src 'none'; script-src 'self' 'sha256-${scriptHash}'; style-src 'self' 'sha256-${cssHash}'; img-src 'self'; font-src 'self'; manifest-src 'self'; connect-src 'self';`
  htmlContent = htmlContent.replace(
    /<meta http-equiv="Content-Security-Policy"[^>]*>/,
    `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`
  )

  // Inject the link tag for CSS before the closing </head> tag
  htmlContent = htmlContent.replace('</head>', `${linkTag}</head>`)

  // Inject the script tag for JS before the closing </body> tag
  htmlContent = htmlContent.replace('</body>', `${scriptTag}</body>`)

  // Inject the git revision into the index
  htmlContent = htmlContent.replace(/<%= GIT_VERSION %>/g, gitRevision())

  // Write the modified HTML back to the index.html file
  fs.writeFileSync(htmlFilePath, htmlContent)
  console.log(`Injected ${path.basename(scriptFile)} and ${path.basename(cssFile)} into index.html with CSP hashes.`)
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
  entryPoints: ['src/index.tsx', 'src/sw.ts'],
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
