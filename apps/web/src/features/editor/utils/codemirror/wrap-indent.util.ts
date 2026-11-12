import { type Extension, RangeSetBuilder } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/** A whole number of tabs: tab stops are measured from the line box, so any other shift moves every tab. */
export function hangColumns(indentColumns: number, tabSize: number): number {
  return (Math.floor(indentColumns / tabSize) + 1) * tabSize
}

export function leadingColumns(text: string, tabSize: number): number {
  let columns = 0
  for (const char of text) {
    if (char === '\t') {
      columns += tabSize - (columns % tabSize)
    } else if (char === ' ') {
      columns += 1
    } else {
      break
    }
  }
  return columns
}

// Wrapped rows start past the line's own indentation, so a wrapped command still reads as one line.
function hangingIndent(hang: number): Decoration {
  return Decoration.line({ attributes: { style: `padding-left: ${hang}ch; text-indent: -${hang}ch` } })
}

function decorate(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const tabSize = view.state.tabSize
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos)
      builder.add(line.from, line.from, hangingIndent(hangColumns(leadingColumns(line.text, tabSize), tabSize)))
      pos = line.to + 1
    }
  }
  return builder.finish()
}

/** Only the display wraps; the configuration keeps its real lines. */
export function wrapWithIndent(): Extension {
  return [
    EditorView.lineWrapping,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet
        constructor(view: EditorView) {
          this.decorations = decorate(view)
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = decorate(update.view)
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    ),
  ]
}
