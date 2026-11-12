import { expose } from 'comlink'
import v86WasmUrl from 'v86/build/v86.wasm?url'
import { installVmFileCache } from '#services/vm/vm-files.service'
import { createVmSession } from '#services/vm/vm-session.service'

// The VM worker's entry point. The cache goes in before v86 makes its first request.
installVmFileCache(self as unknown as { XMLHttpRequest: typeof XMLHttpRequest })

// The bundler serves the wasm beside the worker; only the browser loads this file.
expose(createVmSession(v86WasmUrl))
