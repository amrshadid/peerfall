import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// A relative path: the config is loaded before the app's aliases exist.
import { injectSwManifest, precacheFiles, SW_FILE } from './src/shared/utils/offline/index.ts'

const src = (path: string): string => fileURLToPath(new URL(`./src/${path}`, import.meta.url))
const APP_VERSION: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url))
// The machine caches the image's files itself, and they are far too big to precache.
const VM_DIR = 'vm'

function publicFiles(dir = PUBLIC_DIR, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`
    if (path === VM_DIR) {
      return []
    }
    return entry.isDirectory() ? publicFiles(`${dir}${entry.name}/`, `${path}/`) : [path]
  })
}

// The version hashes the precached files, so every new build installs a new worker.
function serviceWorker(): Plugin {
  return {
    name: 'peerfall:service-worker',
    apply: 'build',
    buildStart() {
      this.emitFile({ type: 'chunk', id: src('sw.ts'), fileName: SW_FILE })
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const worker = bundle[SW_FILE]
        if (worker?.type !== 'chunk') {
          return this.error(`${SW_FILE} is missing from the build`)
        }
        if (worker.imports.length > 0 || worker.dynamicImports.length > 0) {
          return this.error(`${SW_FILE} imports ${worker.imports.join(', ')}: it must share no module with the app`)
        }
        const files = precacheFiles([...Object.keys(bundle), ...publicFiles()])
        const hash = createHash('sha256')
        for (const file of files) {
          const output = bundle[file]
          hash.update(file)
          hash.update(
            output ? (output.type === 'chunk' ? output.code : output.source) : readFileSync(PUBLIC_DIR + file)
          )
        }
        const code = injectSwManifest(worker.code, { version: hash.digest('hex').slice(0, 12), files })
        if (code === null) {
          return this.error(`${SW_FILE} lost its manifest token`)
        }
        try {
          // A worker that throws while it loads never registers, and the game silently loses
          // offline play: run its top level here, where that fails the build.
          runInNewContext(code, {
            self: { registration: { scope: 'https://peerfall.invalid/' }, addEventListener() {} },
          })
        } catch (error) {
          return this.error(
            `${SW_FILE} throws when it loads: ${error instanceof Error ? error.message : String(error)}`
          )
        }
        worker.code = code
      },
    },
  }
}

export default defineConfig({
  // For a host that serves the site under a sub-path; Vercel serves it at the root.
  base: process.env.PF_BASE ?? '/',
  // The one place the version is written is package.json; Settings and the status lines print it.
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: {
      '@': src(''),
      '@shared': src('shared'),
      '@features': src('features'),
      '@app': src('app'),
      '@pages': src('pages'),
    },
  },
  worker: {
    format: 'es',
  },
})
