import type { BoxSides, StageBox, StageInput } from '@features/tour/types'
import { RULE_TOLERANCE_PX } from './tour-driver.constants'

type Side = keyof BoxSides

function edgesOf(box: StageBox): BoxSides {
  return { top: box.top, right: box.left + box.width, bottom: box.top + box.height, left: box.left }
}

function boxOf(edges: BoxSides): StageBox {
  return {
    top: edges.top,
    left: edges.left,
    width: Math.max(0, edges.right - edges.left),
    height: Math.max(0, edges.bottom - edges.top),
  }
}

function overlap(start: number, end: number, otherStart: number, otherEnd: number): number {
  return Math.min(end, otherEnd) - Math.max(start, otherStart)
}

// Panels share rules with the sheet and their neighbours, so a side ends on the line beside it.
export function ruleBeyond(side: Side, box: StageBox, rules: readonly StageBox[]): number | null {
  const edges = edgesOf(box)
  const near = (a: number, b: number) => Math.abs(a - b) <= RULE_TOLERANCE_PX
  let found: number | null = null
  for (const rule of rules.map(edgesOf)) {
    const vertical = side === 'left' || side === 'right'
    const along = vertical
      ? overlap(edges.top, edges.bottom, rule.top, rule.bottom)
      : overlap(edges.left, edges.right, rule.left, rule.right)
    if (along <= RULE_TOLERANCE_PX) {
      continue
    }
    if (side === 'left' && near(rule.right, edges.left)) {
      found = Math.min(found ?? rule.left, rule.left)
    } else if (side === 'right' && near(rule.left, edges.right)) {
      found = Math.max(found ?? rule.right, rule.right)
    } else if (side === 'top' && near(rule.bottom, edges.top)) {
      found = Math.min(found ?? rule.top, rule.top)
    } else if (side === 'bottom' && near(rule.top, edges.bottom)) {
      found = Math.max(found ?? rule.bottom, rule.bottom)
    }
  }
  return found
}

export function unionBox(boxes: readonly StageBox[]): StageBox | null {
  const visible = boxes.filter((box) => box.width > 0 && box.height > 0).map(edgesOf)
  if (visible.length === 0) {
    return null
  }
  return boxOf({
    top: Math.min(...visible.map((edges) => edges.top)),
    right: Math.max(...visible.map((edges) => edges.right)),
    bottom: Math.max(...visible.map((edges) => edges.bottom)),
    left: Math.min(...visible.map((edges) => edges.left)),
  })
}

export function clampBox(box: StageBox, bounds: StageBox): StageBox {
  const edges = edgesOf(box)
  const limit = edgesOf(bounds)
  return boxOf({
    top: Math.min(Math.max(edges.top, limit.top), limit.bottom),
    right: Math.max(Math.min(edges.right, limit.right), limit.left),
    bottom: Math.max(Math.min(edges.bottom, limit.bottom), limit.top),
    left: Math.min(Math.max(edges.left, limit.left), limit.right),
  })
}

// One box for the cut-out and the ink line, so the line always lands on the rules the eye reads as the panel.
export function stageBox(input: StageInput): StageBox {
  const { box, border, rules, padding } = input
  const own = edgesOf(box)
  const sides: Side[] = ['top', 'right', 'bottom', 'left']
  const ruled = Object.fromEntries(
    sides.map((side) => [side, border[side] > 0 ? own[side] : ruleBeyond(side, box, rules)])
  ) as Record<Side, number | null>
  const loose = sides.every((side) => ruled[side] === null)
  // A target with no rule anywhere is framed around what it shows, not its stretched box.
  const base = loose ? edgesOf(input.content ?? box) : own
  const drawn = boxOf({
    top: ruled.top ?? base.top - padding,
    right: ruled.right ?? base.right + padding,
    bottom: ruled.bottom ?? base.bottom + padding,
    left: ruled.left ?? base.left - padding,
  })
  return clampBox(input.frame ? clampBox(drawn, input.frame) : drawn, input.viewport)
}

export function sameBox(a: StageBox, b: StageBox): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

export function boxStyle(box: StageBox): Readonly<Record<keyof StageBox, string>> {
  return { top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }
}
