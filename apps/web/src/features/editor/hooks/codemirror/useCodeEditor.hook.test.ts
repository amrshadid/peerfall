// @vitest-environment jsdom
import type { EditorFile, EditorHandlers } from '@features/editor/types'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type CodeEditorOptions, useCodeEditor } from './useCodeEditor.hook'

const engine = vi.hoisted(() => ({
  handle: {
    showFile: vi.fn(),
    focus: vi.fn(),
    destroy: vi.fn(),
  },
  handlers: null as EditorHandlers | null,
}))

vi.mock('@features/editor/utils/codemirror', () => ({
  mountEditor: (_parent: HTMLElement, handlers: EditorHandlers) => {
    engine.handlers = handlers
    return engine.handle
  },
}))

const A: EditorFile = { path: 'a/frr.conf', content: 'router ospf' }
const B: EditorFile = { path: 'b/frr.conf', content: 'router ospf' }

function handlers(): EditorHandlers {
  return { onChange: vi.fn(), onApply: vi.fn() }
}

async function mounted(options: Partial<CodeEditorOptions> = {}) {
  const container = { current: document.createElement('div') }
  const initialProps: CodeEditorOptions = { file: A, handlers: handlers(), ...options }
  const hook = renderHook((props: CodeEditorOptions) => useCodeEditor(container, props), { initialProps })
  await waitFor(() => expect(hook.result.current.loaded).toBe(true))
  return hook
}

beforeEach(() => {
  for (const fn of Object.values(engine.handle)) {
    fn.mockClear()
  }
})

describe('useCodeEditor', () => {
  it('loads CodeMirror on mount and shows the file', async () => {
    await mounted()
    expect(engine.handle.showFile).toHaveBeenCalledWith(A)
  })

  it("shows another router's configuration when its tab is chosen", async () => {
    const { rerender } = await mounted()
    rerender({ file: B, handlers: handlers() })
    expect(engine.handle.showFile).toHaveBeenLastCalledWith(B)
  })

  it('calls the latest handlers without rebuilding the editor', async () => {
    const { rerender } = await mounted()
    const next = handlers()
    rerender({ file: A, handlers: next })
    engine.handlers?.onApply()
    engine.handlers?.onChange(A.path, 'x')
    expect(next.onApply).toHaveBeenCalled()
    expect(next.onChange).toHaveBeenCalledWith(A.path, 'x')
  })

  it('destroys the editor on unmount', async () => {
    const { unmount } = await mounted()
    unmount()
    expect(engine.handle.destroy).toHaveBeenCalled()
  })

  it("says it failed when CodeMirror's chunk can't be fetched", async () => {
    vi.resetModules()
    vi.doMock('@features/editor/utils/codemirror', () => {
      throw new Error('offline')
    })
    const { useCodeEditor: useFreshCodeEditor } = await import('./useCodeEditor.hook')
    const container = { current: document.createElement('div') }
    const { result } = renderHook(() => useFreshCodeEditor(container, { file: A, handlers: handlers() }))
    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.loaded).toBe(false)
    vi.doUnmock('@features/editor/utils/codemirror')
  })
})
