// @vitest-environment jsdom

import type { EditorHandle, EditorHandlers } from '@features/editor/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountEditor } from './editor-engine.util'

let parent: HTMLElement
let handlers: EditorHandlers
let editor: EditorHandle

/** The text CodeMirror shows: one `.cm-line` per line. */
const shown = () => [...parent.querySelectorAll('.cm-line')].map((line) => line.textContent).join('\n')

const A = { path: 'a/frr.conf', content: 'router ospf\n ospf router-id 10.255.0.1' }
const B = { path: 'b/frr.conf', content: 'router ospf\n ospf router-id 10.255.0.2' }

beforeEach(() => {
  // jsdom has no layout; CodeMirror measures text with these.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  parent = document.createElement('div')
  document.body.append(parent)
  handlers = { onChange: vi.fn(), onApply: vi.fn() }
  editor = mountEditor(parent, handlers)
})

afterEach(() => {
  editor.destroy()
  parent.remove()
})

describe('mountEditor', () => {
  it('shows a configuration without reporting it as an edit', () => {
    editor.showFile(A)
    expect(shown()).toBe(A.content)
    expect(handlers.onChange).not.toHaveBeenCalled()
  })

  it('applies a change made outside the editor as an edit', () => {
    editor.showFile(A)
    editor.showFile({ ...A, content: 'router ospf' })
    expect(shown()).toBe('router ospf')
    expect(handlers.onChange).toHaveBeenCalledWith(A.path, 'router ospf')
  })

  it('keeps each router as it was across tab switches', () => {
    editor.showFile(A)
    editor.showFile(B)
    expect(shown()).toBe(B.content)
    editor.showFile(A)
    expect(shown()).toBe(A.content)
  })

  it('names the file for screen readers', () => {
    editor.showFile(A)
    expect(parent.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('FRR configuration, a/frr.conf')
  })

  it('applies on Mod+Enter and keeps Mod+S from reaching the browser', () => {
    editor.showFile(A)
    const content = parent.querySelector('.cm-content')
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true })
      content?.dispatchEvent(event)
      return event
    }
    press('Enter')
    expect(handlers.onApply).toHaveBeenCalledTimes(1)
    expect(press('s').defaultPrevented).toBe(true)
  })
})
