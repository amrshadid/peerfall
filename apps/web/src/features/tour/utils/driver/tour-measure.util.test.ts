// @vitest-environment jsdom

import type { StageBox } from '@features/tour/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOUR_DRAWING } from './tour-driver.constants'
import { bordersOf, measureStage, rulesOf } from './tour-measure.util'
import { stageBox } from './tour-stage.util'

const boxes = new Map<Element, StageBox>()

function at(element: Element, box: StageBox): Element {
  boxes.set(element, box)
  return element
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const { top, left, width, height } = boxes.get(this) ?? { top: 0, left: 0, width: 0, height: 0 }
    return new DOMRect(left, top, width, height)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  boxes.clear()
  document.body.replaceChildren()
})

// The level page in miniature: a ruled sheet, the Guide with its right rule, the editor over a divider.
function levelPage() {
  document.body.innerHTML = `
    <main class="pf-sheet" style="border: 2px solid black">
      <aside id="guide" style="border-right: 2px solid black"></aside>
      <section id="workspace">
        <div id="editor"><p id="line"></p></div>
        <hr id="divider" />
        <div id="terminal"></div>
      </section>
    </main>`
  const $ = (id: string) => document.getElementById(id) as Element
  at(document.querySelector('main') as Element, { top: 92, left: 16, width: 1008, height: 676 })
  at($('guide'), { top: 94, left: 18, width: 340, height: 672 })
  at($('workspace'), { top: 94, left: 358, width: 664, height: 672 })
  at($('editor'), { top: 94, left: 358, width: 664, height: 400 })
  at($('line'), { top: 110, left: 380, width: 200, height: 20 })
  at($('divider'), { top: 494, left: 358, width: 664, height: 2 })
  at($('terminal'), { top: 496, left: 358, width: 664, height: 270 })
  return $
}

describe('bordersOf and rulesOf', () => {
  it('reads each side of a border and draws a divider whole', () => {
    const $ = levelPage()
    expect(bordersOf($('guide'))).toEqual({ top: 0, right: 2, bottom: 0, left: 0 })
    expect(rulesOf($('guide'))).toEqual([{ top: 94, left: 356, width: 2, height: 672 }])
    expect(rulesOf($('divider'))).toEqual([{ top: 494, left: 358, width: 664, height: 2 }])
    expect(rulesOf($('terminal'))).toEqual([])
  })
})

describe('measureStage', () => {
  it('collects the rules up to the sheet, so a panel lands on the lines around it', () => {
    const $ = levelPage()
    const editor = measureStage($('editor'))
    expect(editor.frame).toEqual({ top: 92, left: 16, width: 1008, height: 676 })
    expect(editor.content).toEqual({ top: 110, left: 380, width: 200, height: 20 })
    expect(editor.padding).toBe(TOUR_DRAWING.loosePaddingPx)
    expect(stageBox(editor)).toEqual({ top: 92, left: 356, width: 668, height: 404 })
    expect(stageBox(measureStage($('terminal')))).toEqual({ top: 494, left: 356, width: 668, height: 274 })
    expect(stageBox(measureStage($('guide')))).toEqual({ top: 92, left: 16, width: 342, height: 676 })
  })

  it('looks one level around a target outside any sheet', () => {
    document.body.innerHTML =
      '<div><div id="sheet" style="border-bottom: 2px solid black"></div><footer></footer></div>'
    at(document.getElementById('sheet') as Element, { top: 0, left: 16, width: 1000, height: 736 })
    const bar = at(document.querySelector('footer') as Element, { top: 736, left: 0, width: 1024, height: 32 })
    const measured = measureStage(bar)
    expect(measured.frame).toBeNull()
    expect(stageBox(measured)).toEqual({ top: 734, left: 0, width: 1024, height: 34 })
  })

  it('stops the editor and the terminal on the splitters beside them, never past them', () => {
    document.body.innerHTML = `
      <main class="pf-sheet" style="border: 2px solid black">
        <aside id="guide"></aside>
        <div id="split-guide" role="separator"></div>
        <section id="workspace">
          <div id="editor"></div>
          <div id="split-editor" role="separator"></div>
          <div id="terminal"></div>
        </section>
        <div id="split-xray" role="separator"></div>
        <div id="xray"></div>
      </main>`
    const $ = (id: string) => document.getElementById(id) as Element
    at(document.querySelector('main') as Element, { top: 92, left: 16, width: 1008, height: 676 })
    at($('guide'), { top: 94, left: 18, width: 300, height: 672 })
    at($('split-guide'), { top: 94, left: 318, width: 2, height: 672 })
    at($('workspace'), { top: 94, left: 320, width: 400, height: 672 })
    at($('editor'), { top: 94, left: 320, width: 400, height: 400 })
    at($('split-editor'), { top: 494, left: 320, width: 400, height: 2 })
    at($('terminal'), { top: 496, left: 320, width: 400, height: 270 })
    at($('split-xray'), { top: 94, left: 720, width: 2, height: 672 })
    at($('xray'), { top: 94, left: 722, width: 300, height: 672 })
    expect(stageBox(measureStage($('editor')))).toEqual({ top: 92, left: 318, width: 404, height: 404 })
    expect(stageBox(measureStage($('terminal')))).toEqual({ top: 494, left: 318, width: 404, height: 274 })
    expect(stageBox(measureStage($('guide')))).toEqual({ top: 92, left: 16, width: 304, height: 676 })
    expect(stageBox(measureStage($('xray')))).toEqual({ top: 92, left: 720, width: 304, height: 676 })
  })
})
