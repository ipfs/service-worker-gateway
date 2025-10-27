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

    // only try to detect prod/staging during a CI run
    if (process.env.CI != null) {
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
      } catch (_) {
        /** noop */
      }
    }

    return `${ref}@${sha}`
  } catch (_) {
    return `no-git-dirty@${new Date().getTime().toString()}`
  }
}

/**
 * Inject all ipfs-sw-*.html pages (not index.html and not ipfs-sw-first-hit.html) in the dist folder with CSS, git revision, and logo.
 *
 * @param {esbuild.Metafile} metafile - esbuild's metafile to extract output file names
 * @param {string} revision - Pre-computed Git revision string
 */
const injectHtmlPages = async (metafile, revision) => {
  const htmlFilePaths = await fs.readdir(path.resolve('dist'), { withFileTypes: true })
    .then(files => files.filter(file => file.isFile() && file.name.endsWith('.html')))
    .then(files => files.map(file => path.resolve('dist', file.name)))

  // htmlFilePaths.push(path.resolve('dist/index.html'))

  for (const htmlFilePath of htmlFilePaths) {
    const baseName = path.basename(htmlFilePath, '.html')
    let jsFile = Object.keys(metafile.outputs).filter(file => file.endsWith('.js') && (file.includes(baseName) || file.includes('index')))
    if (jsFile.length > 1) {
      // override injection of index.js to the basename file
      jsFile = jsFile.find(file => file.includes(baseName))
    } else {
      jsFile = jsFile[0]
    }

    let cssFile = Object.keys(metafile.outputs).filter(file => file.endsWith('.css') && (file.includes(baseName) || file.includes('app')))
    if (cssFile.length > 1) {
      // override injection of index.css to the basename file
      cssFile = cssFile.find(file => file.includes(baseName))
    } else {
      cssFile = cssFile[0]
    }

    const logoFile = Object.keys(metafile.outputs).find(file => file.endsWith('.svg') && file.includes('ipfs-sw-ipfs-logo'))

    let htmlContent = await fs.readFile(htmlFilePath, 'utf8')

    if (htmlContent.includes('<%= JS_SCRIPT_TAG %>')) {
      if (jsFile != null) {
        const jsTag = `<script type="module" src="/${path.basename(jsFile)}"></script>`
        htmlContent = htmlContent.replace(/<%= JS_SCRIPT_TAG %>/g, jsTag)
        console.log(`Injected ${path.basename(jsFile)} into ${path.relative(process.cwd(), htmlFilePath)}.`)
      } else {
        throw new Error(`Could not find a js file to include in ${path.relative(process.cwd(), htmlFilePath)}.`)
      }
    }

    // only inject CSS for non-index.html files, or if explicitly requested
    if (htmlContent.includes('<%= CSS_STYLES %>')) {
      if (baseName === 'index') {
        // for index.html, don't inject CSS - it will be injected dynamically by JavaScript
        htmlContent = htmlContent.replace(/<%= CSS_STYLES %>/g, '')
        console.log(`Removed CSS injection from ${path.relative(process.cwd(), htmlFilePath)} - will be injected dynamically.`)
      } else if (cssFile != null) {
        const cssTag = `<link rel="stylesheet" href="/${path.basename(cssFile)}">`
        htmlContent = htmlContent.replace(/<%= CSS_STYLES %>/g, cssTag)
        console.log(`Injected ${path.basename(cssFile)} into ${path.relative(process.cwd(), htmlFilePath)}.`)
      } else {
        throw new Error(`Could not find an index.css file to include in ${path.relative(process.cwd(), htmlFilePath)}.`)
      }
    }

    if (htmlContent.includes('<%= IPFS_LOGO_PATH %>')) {
      if (logoFile != null) {
        htmlContent = htmlContent.replace(/<%= IPFS_LOGO_PATH %>/g, path.basename(logoFile))
        console.log(`Injected ${path.basename(logoFile)} into ${path.relative(process.cwd(), htmlFilePath)}.`)
      } else {
        throw new Error(`Could not find the logo file to include in ${path.relative(process.cwd(), htmlFilePath)}.`)
      }
    }

    if (!htmlContent.includes('<%= GIT_VERSION %>')) {
      // if you see this error, make sure you update the HTML file to include an html comment similar to the one in public/index.html
      throw new Error(`${path.relative(process.cwd(), htmlFilePath)} does not contain <%= GIT_VERSION %>.`)
    }

    htmlContent = htmlContent.replace(/<%= GIT_VERSION %>/g, revision)
    console.log(`Added git revision (${revision}) to ${path.relative(process.cwd(), htmlFilePath)}.`)

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
 * Replaces strings with paths to built files, e.g. `'<%-- src/app.tsx --%>'`
 * becomes `'./path/to/app-HASH.js'`
 *
 * @type {esbuild.Plugin}
 */
const replaceImports = {
  name: 'modify-built-files',
  setup (build) {
    build.onEnd(async (result) => {
      const metafile = result.metafile

      // Replace '<%-- src --%>' with 'path/to/built/file'
      const buildInfo = {}
      const jsFiles = []

      for (const [outputFile, meta] of Object.entries(metafile.outputs)) {
        if (outputFile.endsWith('.css')) {
          buildInfo[Object.keys(meta.inputs)[0]] = outputFile
        } else if (outputFile.endsWith('.svg')) {
          buildInfo[Object.keys(meta.inputs)[0]] = outputFile
        } else if (outputFile.endsWith('.js') && meta.entryPoint != null) {
          buildInfo[meta.entryPoint] = outputFile
          jsFiles.push(outputFile)
        } else if (outputFile.endsWith('.map')) {
          // ignore
        } else {
          console.info('Unknown file type:', outputFile, meta)
        }
      }

      const regex = /<%--\s(.*)\s--%>/g

      for (const jsFile of jsFiles) {
        let file = await fs.readFile(path.resolve(jsFile), 'utf-8')

        for (const [target, source] of file.matchAll(regex)) {
          const bundledFile = buildInfo[source].replace('dist', '')

          console.info('Replace', target, 'with', bundledFile, 'in', jsFile)

          file = file.replaceAll(target, bundledFile)
        }

        await fs.writeFile(path.resolve(jsFile), file)
      }
    })
  }
}

/**
 * Updates the built version of `src/version.ts` to contain the latest package
 * version and git revision, then overrides the path to the file when it is
 * imported
 *
 * @type {esbuild.Plugin}
 */
const updateVersions = {
  name: 'update-versions',
  async setup (build) {
    const pkg = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf-8'))
    const rev = gitRevision()

    console.info('Detected versions', pkg.name, pkg.version, rev)

    await fs.writeFile(path.resolve('dist-tsc/src/version.js'), `export const APP_NAME = '${pkg.name}'
export const APP_VERSION = '${pkg.version}'
export const GIT_REVISION = '${rev}'
`)

    const target = path.resolve('src/version')

    build.onResolve({ filter: /(.*)version\.[j|t]s/ }, args => {
      const file = path.resolve(args.resolveDir, args.path)

      if (file !== `${target}.js` && file !== `${target}.ts`) {
        return
      }

      return {
        path: path.resolve('dist-tsc/src/version.js')
      }
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
      const metafile = result.metafile

      // Cache the Git revision once
      const revision = gitRevision()

      // Run copyPublicFiles first to make sure public assets are in place
      await copyPublicFiles()

      await injectHtmlPages(metafile, revision)

      // Modify the redirects file last
      await modifyRedirects()

      // create a CSS config file we will use to get the proper CSS filename
      const indexCssFile = Object.keys(metafile.outputs).find(file => file.endsWith('.css') && file.includes('app'))
      if (indexCssFile) {
        const cssConfigContent = `export const CSS_FILENAME = '${path.basename(indexCssFile)}'`
        await fs.writeFile(path.resolve('dist/ipfs-sw-css-config.js'), cssConfigContent)
        console.log(`Created dist/ipfs-sw-css-config.js with CSS filename: ${path.basename(indexCssFile)}`)
      }

      // create an app chunk config file we will use to get the proper app chunk filename for importing all the UI dynamically
      const appChunkFile = Object.keys(metafile.outputs).find(file => file.endsWith('.js') && file.includes('app'))
      if (appChunkFile) {
        const appConfigContent = `export const APP_FILENAME = '${path.basename(appChunkFile)}'`
        await fs.writeFile(path.resolve('dist/ipfs-sw-app-config.js'), appConfigContent)
        console.log(`Created dist/ipfs-sw-app-config.js with app chunk filename: ${path.basename(appChunkFile)}`)
      }
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
  entryPoints: [
    'src/index.tsx',
    'src/sw.ts',
    'src/app.tsx',
    'src/internal-error.tsx',
    'src/ipfs-sw-*.ts',
    'src/ipfs-sw-*.css'
  ],
  bundle: true,
  outdir: 'dist',
  loader: {
    '.js': 'jsx',
    '.css': 'css',
    '.svg': 'file'
  },
  minify: false,
  sourcemap: 'inline',
  metafile: true,
  splitting: false,
  target: ['es2020'],
  format: 'esm',
  entryNames: 'ipfs-sw-[name]-[hash]',
  assetNames: 'ipfs-sw-[name]-[hash]',
  plugins: [replaceImports, renameSwPlugin, updateVersions, modifyBuiltFiles, excludeFilesPlugin(['.eot?#iefix', '.otf', '.woff', '.woff2'])]
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
