/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
 * Inject all ipfs-sw-*.html pages (not index.html) in the dist folder with CSS, git revision, and logo.
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
       if (cssFile != null) {
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
 * in the dist folder except for index.html and _redirects.
 */
const modifyRedirects = async () => {
  const redirectsFilePath = path.resolve('dist/_redirects')
  const redirectsContent = await fs.readFile(redirectsFilePath, 'utf8')
  const distFiles = await fs.readdir(path.resolve('dist'))
  const files = distFiles.filter(file => !['_redirects', 'index.html'].includes(file))
  const lines = redirectsContent.split('\n')
    .filter(line => line.trim() !== '')

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
    build.onEnd(async (result) => {
      const metafile = result.metafile
      const outdir = path.resolve('dist')
      let foundSwEntry = false

      for (const [file, meta] of Object.entries(metafile.outputs)) {
        if (meta.entryPoint !== 'src/sw/index.ts') {
          continue
        }

        foundSwEntry = true
        const newPath = path.join(outdir, 'ipfs-sw-sw.js')

        await fs.cp(file, newPath)
        console.log(`Renamed ${file} to ipfs-sw-sw.js`)

        await fs.cp(`${file}.map`, path.join(outdir, 'ipfs-sw-sw.js.map'))
        console.log(`Renamed ${file}.map to ipfs-sw-sw.js.map`)

        const contents = await fs.readFile(newPath, 'utf8')
        const newContents = contents.replace(/sourceMappingURL=.*\.js\.map/, 'sourceMappingURL=ipfs-sw-sw.js.map')
        await fs.writeFile(newPath, newContents)
      }

      if (!foundSwEntry) {
        throw new Error('Could not find service worker entry point in build result meta - did the entry point filename change?')
      }
    })
  }
}

/**
 * Replaces strings with paths to built files, e.g. `'<%-- src/ui/index.tsx --%>'`
 * becomes `'./path/to/app-HASH.js'`
 *
 * @type {esbuild.Plugin}
 */
const replaceImports = {
  name: 'replace-imports',
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
          if (buildInfo[source] == null) {
            throw new Error(`"${source}" was not a valid build file - you may have an invalid replacement in a file. Search for: "<%-- ${source} --%>"`)
          }

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
 * a simple plugin to replace environment source file based on the build environment
 */
const configFilePlugin = {
  name: 'config-file-replacement',
  setup (build) {
    build.onLoad({
      filter: /src\/config\/index.ts/,
      namespace: 'file'
    },
    async (args) => {
      let configFile = ''

      if (process.env.NODE_ENV === 'test') {
        configFile = '-test'
      } else if (process.env.NODE_ENV === 'development') {
        configFile = '-development'
      }

      const fileReplacementPath = args.path.replace(
        'index.ts',
          `index${configFile}.ts`
      )

      const fileReplacementContent = await fs.readFile(
        fileReplacementPath,
        'utf8'
      )

      return {
        contents: fileReplacementContent,
        loader: 'default'
      }
    }
    )
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

      for (const [file, meta] of Object.entries(metafile.outputs)) {
        if (meta.entryPoint != null) {
          console.info(meta.entryPoint, '->', file)
        }

        // create an app chunk config file we will use to get the proper app
        // chunk filename for importing all the UI dynamically
        if (meta.entryPoint === 'src/ui/index.tsx') {
          const appConfigContent = `export const APP_FILENAME = '${path.basename(file)}'`
          await fs.writeFile(path.resolve('dist/ipfs-sw-app-config.js'), appConfigContent)
          console.log(`Created dist/ipfs-sw-app-config.js with app chunk filename: ${path.basename(file)}`)
        }
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

const pkg = JSON.parse(readFileSync(path.resolve('package.json'), 'utf-8'))
const rev = gitRevision()
console.info('Detected versions', pkg.name, pkg.version, rev)

/**
 * @type {esbuild.BuildOptions}
 */
export const buildOptions = {
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.APP_NAME': `'${pkg.name}'`,
    'process.env.APP_VERSION': `'${pkg.version}'`,
    'process.env.GIT_REVISION': `'${rev}'`
  },
  entryPoints: [
    'src/index.tsx',
    'src/sw/index.ts',
    'src/ui/index.tsx'
  ],
  bundle: true,
  outdir: 'dist',
  loader: {
    '.js': 'jsx',
    '.css': 'css',
    '.svg': 'file'
  },
  minify: process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development',
  sourcemap: 'linked',
  metafile: true,
  splitting: false,
  target: ['es2020'],
  format: 'esm',
  entryNames: 'ipfs-sw-[name]-[hash]',
  assetNames: 'ipfs-sw-[name]-[hash]',
  plugins: [
    replaceImports,
    renameSwPlugin,
    configFilePlugin,
    modifyBuiltFiles,
    excludeFilesPlugin(['.eot?#iefix', '.otf', '.woff', '.woff2'])
  ],
  alias: {
    debug: 'weald',
    react: 'preact/compat',
    'react-dom/test-utils': 'preact/test-utils',
    'react-dom': 'preact/compat', // Must be below test-utils
    'react/jsx-runtime': 'preact/jsx-runtime'
  }
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
    const result = await ctx.rebuild()
    await fs.writeFile('dist/meta.json', JSON.stringify(result.metafile))
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
    port: 8345
  })
  console.info(`Listening on http://localhost:${port}`)
}
