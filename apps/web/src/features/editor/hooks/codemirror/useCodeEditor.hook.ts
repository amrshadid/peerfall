import type { EditorFile, EditorHandle, EditorHandlers } from '@features/editor/types'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'

export interface CodeEditorOptions {
  readonly file: EditorFile | undefined
  readonly handlers: EditorHandlers
}

export interface CodeEditor {
  readonly loaded: boolean
  /** CodeMirror's chunk couldn't be fetched (offline after a new deploy). */
  readonly failed: boolean
}

/** CodeMirror is imported on mount, so it stays out of the first-load bundle. */
export function useCodeEditor(
  container: RefObject<HTMLDivElement | null>,
  { file, handlers }: CodeEditorOptions
): CodeEditor {
  const [editor, setEditor] = useState<EditorHandle | null>(null)
  const [failed, setFailed] = useState(false)
  const latest = useRef(handlers)
  latest.current = handlers

  useEffect(() => {
    const element = container.current
    if (!element) {
      return
    }
    let handle: EditorHandle | null = null
    let cancelled = false
    import('@features/editor/utils/codemirror').then(
      ({ mountEditor }) => {
        if (cancelled) {
          return
        }
        handle = mountEditor(element, {
          onChange: (path, content) => latest.current.onChange(path, content),
          onApply: () => latest.current.onApply(),
        })
        setEditor(handle)
      },
      () => {
        if (!cancelled) {
          setFailed(true)
        }
      }
    )
    return () => {
      cancelled = true
      handle?.destroy()
      setEditor(null)
    }
  }, [container])

  useEffect(() => {
    if (editor && file) {
      editor.showFile(file)
    }
  }, [editor, file])

  return useMemo(() => ({ loaded: editor !== null, failed }), [editor, failed])
}
