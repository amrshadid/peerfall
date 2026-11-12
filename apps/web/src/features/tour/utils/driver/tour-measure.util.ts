import type { BoxSides, StageBox, StageInput } from '@features/tour/types'
import { TOUR_DRAWING, TOUR_FRAME_SELECTOR } from './tour-driver.constants'
import { unionBox } from './tour-stage.util'

function boxOf(element: Element): StageBox {
  const { top, left, width, height } = element.getBoundingClientRect()
  return { top, left, width, height }
}

function isShown(box: StageBox): boolean {
  return box.width > 0 && box.height > 0
}

export function bordersOf(element: Element): BoxSides {
  const style = getComputedStyle(element)
  const width = (lineStyle: string, value: string) =>
    lineStyle === 'none' || lineStyle === 'hidden' ? 0 : Number.parseFloat(value) || 0
  return {
    top: width(style.borderTopStyle, style.borderTopWidth),
    right: width(style.borderRightStyle, style.borderRightWidth),
    bottom: width(style.borderBottomStyle, style.borderBottomWidth),
    left: width(style.borderLeftStyle, style.borderLeftWidth),
  }
}

// An `<hr>` or a splitter draws its line with a background, not a border; missing one pads the cut-out over it.
export function rulesOf(element: Element): StageBox[] {
  const box = boxOf(element)
  if (!isShown(box)) {
    return []
  }
  if (element instanceof HTMLHRElement || element.getAttribute('role') === 'separator') {
    return [box]
  }
  const border = bordersOf(element)
  const { top, left, width, height } = box
  const sides: StageBox[] = [
    { top, left, width, height: border.top },
    { top, left: left + width - border.right, width: border.right, height },
    { top: top + height - border.bottom, left, width, height: border.bottom },
    { top, left, width: border.left, height },
  ]
  return sides.filter(isShown)
}

// A panel's lines can belong to its parent's neighbours (the Guide's rule beside the editor), so walk up to the sheet.
export function rulesAround(target: Element, frame: Element | null): StageBox[] {
  const rules: StageBox[] = []
  let node = target
  for (let parent = node.parentElement; parent; node = parent, parent = parent.parentElement) {
    for (const sibling of parent.children) {
      if (sibling !== node) {
        rules.push(...rulesOf(sibling))
      }
    }
    rules.push(...rulesOf(parent))
    if (!frame || parent === frame) {
      break
    }
  }
  return rules
}

export function measureStage(target: Element): StageInput {
  const frame = target.parentElement?.closest(TOUR_FRAME_SELECTOR) ?? null
  return {
    box: boxOf(target),
    border: bordersOf(target),
    content: unionBox([...target.children].map(boxOf)),
    rules: rulesAround(target, frame),
    frame: frame ? boxOf(frame) : null,
    viewport: { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight },
    padding: TOUR_DRAWING.loosePaddingPx,
  }
}
