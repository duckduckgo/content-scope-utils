/**
 * @module Special Pages
 * @category Special Pages
 *
 * @description
 *
 * A collection of HTML/CSS/JS pages that can be loaded into privileged environments, like `about: pages`
 *
 * - {@link "Example Page"}
 *
 * [[include:packages/special-pages/readme.md]]
 *
 */
import { buildSync } from 'esbuild'
import { cwd, parseArgs } from '@duckduckgo/content-scope-scripts/scripts/script-utils.js'
import { join, relative } from 'node:path'
import { cpSync, rmSync } from 'node:fs'

const args = parseArgs(process.argv.slice(2), [])
const CWD = cwd(import.meta.url)
const ROOT = join(CWD, '..')
const VERSION = args.version ?? 'v1'
const BUILD = join(CWD, 'dist')
const NODE_ENV = args.env || 'production'
const DEBUG = Boolean(args.debug)
const DRY_RUN = args.dryrun ?? false

console.log('NODE_ENV', NODE_ENV)

/** @type {{src: string, dest: string}[]} */
const copyJobs = [
  {
    src: join(CWD, 'src/index.html'),
    dest: join(BUILD, '/index.html'),
  },
  {
    src: join(CWD, 'src/assets'),
    dest: join(BUILD, '/assets'),
  },
  {
    src: join(CWD, 'schema/__fixtures__'),
    dest: join(BUILD, '/fixtures'),
  },
  {
    src: BUILD,
    dest: join(ROOT, 'docs/debugger', VERSION),
  },
]

const buildJob = {
  src: join(CWD, 'src/js/index.js'),
  dest: join(BUILD, 'js/index.js'),
}
// monaco stuff
const workerEntryPoints = ['editor/json.mjs', 'editor/editor.mjs']
buildSync({
  entryPoints: workerEntryPoints,
  bundle: true,
  format: 'iife',
  outdir: join(BUILD, 'js/editor'),
  minify: NODE_ENV === 'production',
})
buildSync({
  entryPoints: [buildJob.src],
  outfile: buildJob.dest,
  bundle: true,
  format: 'iife',
  sourcemap: NODE_ENV === 'development' ? 'inline' : undefined,
  loader: {
    '.js': 'jsx',
    '.ttf': 'file',
    '.module.css': 'local-css',
  },
  define: {
    'import.meta.env': JSON.stringify(NODE_ENV),
  },
  minify: NODE_ENV === 'production',
})

for (const copyJob of copyJobs) {
  if (DEBUG) console.log('COPY:', relative(CWD, copyJob.src), relative(CWD, copyJob.dest))
  if (!DRY_RUN) {
    rmSync(copyJob.dest, {
      force: true,
      recursive: true,
    })
    cpSync(copyJob.src, copyJob.dest, {
      force: true,
      recursive: true,
    })
  }
}
