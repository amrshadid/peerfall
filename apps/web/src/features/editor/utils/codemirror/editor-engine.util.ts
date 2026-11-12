import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentUnit, StreamLanguage, type StreamParser } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorState, type Extension, Prec } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import type { EditorFile, EditorHandle, EditorHandlers, FrrToken } from '@features/editor/types'
import { tokenizeFrrLine } from '@features/editor/utils/syntax'
import { section2Theme } from './section2-theme.constants'
import { wrapWithIndent } from './wrap-indent.util'

/** FRR writes a configuration with one space per level (`show running-config`), so the editor does too. */
const INDENT = ' '
const TAB_SIZE = 8

interface FrrLineState {
  tokens: readonly FrrToken[]
  next: number
}

// A configuration has no state across lines: each line is split whole, then handed out piece by piece.
const frrConfig: StreamParser<FrrLineState> = {
  name: 'frr',
  startState: () => ({ tokens: [], next: 0 }),
  token(stream, state) {
    if (stream.sol()) {
      state.tokens = tokenizeFrrLine(stream.string)
      state.next = 0
    }
    const token = state.tokens[state.next++]
    if (!token) {
      stream.skipToEnd()
      return null
    }
    stream.pos = token.to
    return token.kind
  },
  languageData: { commentTokens: { line: '!' } },
}

/** Always handles the key, so nothing else sees it. */
const handled = (action: () => void) => (): boolean => {
  action()
  return true
}

function shortcuts(handlers: EditorHandlers): Extension {
  return Prec.highest(
    keymap.of([
      { key: 'Mod-Enter', run: handled(() => handlers.onApply()), preventDefault: true },
      // Players press Mod+S by habit; never let it open "Save page". Every edit is already kept.
      { key: 'Mod-s', run: handled(() => {}), preventDefault: true },
    ])
  )
}

function fileExtensions(file: EditorFile, handlers: EditorHandlers): Extension {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    shortcuts(handlers),
    keymap.of([
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      // Escape, then Tab, leaves the editor, so Tab is no keyboard trap.
      indentWithTab,
    ]),
    StreamLanguage.define(frrConfig),
    indentUnit.of(INDENT),
    EditorState.tabSize.of(TAB_SIZE),
    wrapWithIndent(),
    EditorState.readOnly.of(file.readOnly ?? false),
    EditorView.contentAttributes.of({ 'aria-label': `FRR configuration, ${file.path}` }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handlers.onChange(file.path, update.state.doc.toString())
      }
    }),
    section2Theme,
  ]
}

/** This module is loaded lazily, with CodeMirror itself. */
export function mountEditor(parent: HTMLElement, handlers: EditorHandlers): EditorHandle {
  const view = new EditorView({ parent })
  const states = new Map<string, EditorState>()
  let current: string | null = null

  return {
    showFile(file) {
      if (current !== null) {
        states.set(current, view.state)
      }
      const state =
        states.get(file.path) ??
        EditorState.create({
          doc: file.content,
          extensions: fileExtensions(file, handlers),
        })
      if (current !== file.path) {
        view.setState(state)
        current = file.path
      }
      if (view.state.doc.toString() !== file.content) {
        // Changed outside the editor (reset to the mission's start): one undoable edit.
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: file.content } })
      }
    },
    focus() {
      view.focus()
    },
    destroy() {
      view.destroy()
    },
  }
}
