import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

// CodeMirror themes are CSS, so the tokens work directly and Night print needs no second theme.
const v = (token: string, fallback: string): string => `var(${token}, ${fallback})`

const SHEET = v('--sheet', '#fafaf7')
const SOFT = v('--soft', '#e5e5df')
const INK = v('--ink', '#141414')
const INK_2 = v('--ink-2', '#55554f')
const RED_WASH = v('--red-wash', '#f3e9e6')
const BLUE = v('--blue', '#1f4fa3')
const MONO = v('--mono', '"IBM Plex Mono", ui-monospace, Menlo, monospace')

const chrome = EditorView.theme({
  '&': { height: '100%', backgroundColor: SHEET, color: INK, fontSize: '14px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: MONO, lineHeight: '20px', fontVariantLigatures: 'none' },
  '.cm-content': { caretColor: INK, padding: '8px 0 72px' },
  '.cm-cursor, .cm-dropCursor': { borderLeft: `2px solid ${INK}` },
  '.cm-gutters': {
    backgroundColor: SHEET,
    color: INK_2,
    border: 'none',
    borderRight: `2px solid ${SOFT}`,
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 14px 0 8px', minWidth: '40px' },
  '.cm-activeLine': { backgroundColor: 'transparent', boxShadow: `inset 3px 0 0 ${SOFT}` },
  '.cm-activeLineGutter': { backgroundColor: SOFT, color: INK },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: RED_WASH,
  },
  '.cm-matchingBracket': { outline: `1px solid ${INK}`, backgroundColor: 'transparent' },
  '.cm-searchMatch': { outline: `1px solid ${BLUE}` },
  '.cm-tooltip': {
    backgroundColor: SHEET,
    color: INK,
    border: `2px solid ${INK}`,
    borderRadius: '0',
    maxWidth: 'min(72ch, calc(100vw - 32px))',
  },
  '.cm-panels': { backgroundColor: SOFT, color: INK, borderColor: INK },
})

// Built-in types (int, char, void) read as keywords, typedefs (pid_t) as types.
const code = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.modifier, tags.standard(tags.typeName)],
    color: v('--code-kw', '#141414'),
    fontWeight: '600',
  },
  { tag: tags.typeName, color: v('--code-type', '#1f4fa3') },
  { tag: [tags.string, tags.character], color: v('--code-str', '#1d6b3a') },
  { tag: tags.comment, color: v('--code-com', '#55554f'), fontStyle: 'italic' },
  {
    tag: [tags.processingInstruction, tags.macroName, tags.meta],
    color: v('--code-pre', '#7a4a00'),
  },
  { tag: [tags.number, tags.bool, tags.null], color: v('--code-num', '#1f4fa3') },
])

export const section2Theme: Extension = [chrome, syntaxHighlighting(code)]
