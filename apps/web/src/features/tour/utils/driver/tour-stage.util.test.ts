import type { StageBox, StageInput } from '@features/tour/types'
import { describe, expect, it } from 'vitest'
import { boxStyle, clampBox, ruleBeyond, sameBox, stageBox, unionBox } from './tour-stage.util'

const NO_BORDER = { top: 0, right: 0, bottom: 0, left: 0 }
const VIEWPORT = { top: 0, left: 0, width: 1440, height: 900 }

// The level page at 1440×900: a sheet with 2px rules, the Guide's own right rule, X-ray's own left rule.
const SHEET = { top: 92, left: 16, width: 1408, height: 776 }
const sheetRules: StageBox[] = [
  { top: 92, left: 16, width: 1408, height: 2 },
  { top: 92, left: 1422, width: 2, height: 776 },
  { top: 866, left: 16, width: 1408, height: 2 },
  { top: 92, left: 16, width: 2, height: 776 },
]
const guideRight = { top: 94, left: 356, width: 2, height: 772 }
const xrayLeft = { top: 94, left: 1012, width: 2, height: 772 }
const divider = { top: 560, left: 358, width: 654, height: 2 }

function input(overrides: Partial<StageInput>): StageInput {
  return {
    box: { top: 0, left: 0, width: 0, height: 0 },
    border: NO_BORDER,
    content: null,
    rules: [],
    frame: null,
    viewport: VIEWPORT,
    padding: 6,
    ...overrides,
  }
}

describe('stageBox', () => {
  it("lands a panel's sides on the sheet's rules and keeps its own", () => {
    const guide = input({
      box: { top: 94, left: 18, width: 340, height: 772 },
      border: { ...NO_BORDER, right: 2 },
      rules: sheetRules,
      frame: SHEET,
    })
    expect(stageBox(guide)).toEqual({ top: 92, left: 16, width: 342, height: 776 })
  })

  it("lands a borderless panel on its neighbours' rules and the divider", () => {
    const editor = input({
      box: { top: 94, left: 358, width: 654, height: 466 },
      rules: [...sheetRules, guideRight, xrayLeft, divider],
      frame: SHEET,
    })
    expect(stageBox(editor)).toEqual({ top: 92, left: 356, width: 658, height: 470 })
  })

  it('pads a target with no rule around what it shows, not its stretched box', () => {
    const rail = input({
      box: { top: 52, left: 326, width: 680, height: 20 },
      content: { top: 52, left: 326, width: 510, height: 20 },
    })
    expect(stageBox(rail)).toEqual({ top: 46, left: 320, width: 522, height: 32 })
  })

  it('keeps a target at the viewport edge fully on screen', () => {
    const statusBar = input({ box: { top: 868, left: 0, width: 1440, height: 32 } })
    expect(stageBox(statusBar)).toEqual({ top: 862, left: 0, width: 1440, height: 38 })
  })

  it('pads only the sides without a rule, then clamps to the viewport', () => {
    const statusBar = input({ box: { top: 868, left: 0, width: 1440, height: 32 }, rules: [sheetRules[2] as StageBox] })
    expect(stageBox(statusBar)).toEqual({ top: 866, left: 0, width: 1440, height: 34 })
  })

  it('never runs past the sheet it sits in', () => {
    const near = input({ box: { top: 96, left: 20, width: 100, height: 40 }, frame: SHEET })
    expect(stageBox(near)).toEqual({ top: 92, left: 16, width: 110, height: 50 })
  })

  it('keeps only the visible part of a panel taller than the viewport', () => {
    const tall = input({ box: { top: -200, left: 100, width: 300, height: 1400 }, border: { ...NO_BORDER, top: 2 } })
    expect(stageBox(tall)).toEqual({ top: 0, left: 94, width: 312, height: 900 })
  })

  it("matches a bordered control's own border box exactly", () => {
    const taint = input({
      box: { top: 44, left: 1020, width: 178, height: 36 },
      border: { top: 2, right: 2, bottom: 2, left: 2 },
    })
    expect(stageBox(taint)).toEqual({ top: 44, left: 1020, width: 178, height: 36 })
  })
})

describe('ruleBeyond', () => {
  const box = { top: 100, left: 100, width: 200, height: 100 }

  it('finds a rule lying against a side, within a pixel', () => {
    expect(ruleBeyond('left', box, [{ top: 90, left: 97.5, width: 2, height: 200 }])).toBe(97.5)
    expect(ruleBeyond('bottom', box, [{ top: 200, left: 0, width: 400, height: 2 }])).toBe(202)
  })

  it('ignores a rule that is a gap away or that does not run along the side', () => {
    expect(ruleBeyond('left', box, [{ top: 90, left: 80, width: 2, height: 200 }])).toBeNull()
    expect(ruleBeyond('top', box, [{ top: 98, left: 400, width: 100, height: 2 }])).toBeNull()
  })
})

describe('unionBox', () => {
  it('spans the shown boxes and skips empty ones', () => {
    expect(
      unionBox([
        { top: 10, left: 10, width: 20, height: 20 },
        { top: 0, left: 0, width: 0, height: 0 },
        { top: 40, left: 50, width: 10, height: 5 },
      ])
    ).toEqual({ top: 10, left: 10, width: 50, height: 35 })
    expect(unionBox([])).toBeNull()
  })
})

describe('clampBox', () => {
  it('cuts a box to its bounds and never goes negative', () => {
    expect(clampBox({ top: -6, left: -6, width: 100, height: 100 }, VIEWPORT)).toEqual({
      top: 0,
      left: 0,
      width: 94,
      height: 94,
    })
    expect(clampBox({ top: 1000, left: 0, width: 10, height: 10 }, VIEWPORT).height).toBe(0)
  })
})

describe('sameBox', () => {
  const panel = { top: 100, left: 40, width: 300, height: 200 }

  it('tells a moved or resized box from the same one', () => {
    expect(sameBox(panel, { ...panel })).toBe(true)
    expect(sameBox(panel, { ...panel, top: 101 })).toBe(false)
    expect(sameBox(panel, { ...panel, width: 299 })).toBe(false)
  })
})

describe('boxStyle', () => {
  it('places a box in px', () => {
    expect(boxStyle({ top: 94, left: 34, width: 312, height: 212 })).toEqual({
      top: '94px',
      left: '34px',
      width: '312px',
      height: '212px',
    })
  })
})
