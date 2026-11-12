import type {
  JourneyChapter,
  JourneyStop,
  MapScene,
  MapVariant,
  RoadPoint,
  SceneChapter,
  SceneOrigin,
  SceneRect,
  SceneStop,
  SceneStretch,
  SceneTerminus,
  SceneText,
  TextStyle,
} from '@features/map/types'
import { isReached } from '@features/map/utils/journey'
import { roadOf } from '@features/map/utils/marks'
import { cellsOf, perRowAt, rowsOf } from './map-grid.util'
import { EDGE, LINE, NUM_DROP, ORIGIN, PAD, PLANNED_DROP, STOP_DROP, TERMINUS, TOP } from './map-layout.constants'
import { END_WORDS, GLYPH } from './map-text.constants'
import { charsIn, stopLines, textWidth, wrapWords } from './map-text.util'

function text(
  x: number,
  y: number,
  value: string,
  style: TextStyle,
  anchor: SceneText['anchor'] = 'start',
  dim = false
): SceneText {
  return { x, y, text: value, style, anchor, dim }
}

function stopTexts(stop: JourneyStop, x: number, y: number, maxChars: number): SceneText[] {
  const dim = !isReached(stop)
  return [
    text(x, y + NUM_DROP, stop.number, 'num', 'middle', dim),
    ...stopLines(stop.title, maxChars).map((line, index) =>
      text(x, y + NUM_DROP + LINE * (index + 1), line, 'label', 'middle', dim)
    ),
  ]
}

class Builder {
  y = TOP
  /** +1: the next row runs left to right. */
  dir = 1
  readonly points: RoadPoint[] = []
  readonly stopPoint = new Map<string, number>()
  readonly stops: SceneStop[] = []
  origin: SceneOrigin | null = null
  terminus: SceneTerminus | null = null

  constructor(
    readonly width: number,
    readonly variant: MapVariant
  ) {}

  /** The overview keeps a header to its name and progress, so more of the road fits around "you". */
  get full(): boolean {
    return this.variant === 'map'
  }

  get contentWidth(): number {
    return this.width - 2 * PAD
  }

  edge(dir: number): number {
    return dir > 0 ? EDGE : this.width - EDGE
  }

  point(x: number, y: number, pencil = false): void {
    this.points.push({ x, y, pencil })
  }

  /** The road comes down the side it left the last row on, then turns along this row. */
  enterAt(y: number, pencil = false): void {
    this.point(this.edge(this.dir), y, pencil)
  }

  /** The journey starts at one router: the road leaves its box and turns down into the first stage. */
  originRow(): void {
    const box = { x: PAD, y: this.y + ORIGIN.drop, width: ORIGIN.width, height: ORIGIN.height }
    const middle = box.y + box.height / 2
    const wordsX = box.x + box.width + ORIGIN.gap
    const texts = [
      text(wordsX, box.y + 10, END_WORDS.originKicker.toUpperCase(), 'kicker'),
      text(wordsX, box.y + 30, END_WORDS.originName, 'region'),
    ]
    if (this.full) {
      const nameEnd = wordsX + textWidth(END_WORDS.originName, GLYPH.region) + 14
      const room = this.width - PAD - nameEnd
      // Beside the name where it fits on one line; a narrow sheet goes without.
      if (textWidth(END_WORDS.originCaption, GLYPH.meta) <= room) {
        texts.push(text(nameEnd, box.y + 30, END_WORDS.originCaption, 'meta'))
      }
    }
    this.origin = { box, texts }
    this.point(box.x, middle)
    this.point(this.edge(this.dir), middle)
    this.y = box.y + box.height + ORIGIN.below
  }

  header(chapter: JourneyChapter): { texts: SceneText[]; panel: SceneRect } {
    const texts: SceneText[] = []
    const top = this.y + 14
    let y = top + 6
    for (const line of wrapWords(chapter.kicker.toUpperCase(), charsIn(this.contentWidth, GLYPH.kicker))) {
      y += 18
      texts.push(text(PAD, y, line, 'kicker'))
    }
    y += 30
    texts.push(text(PAD, y, chapter.name, 'zone', 'start', chapter.planned))
    const progress = chapter.planned ? 'planned' : chapter.progress
    const fits = PAD + textWidth(chapter.name, GLYPH.zone) + 24 + textWidth(progress, GLYPH.caption) <= this.width - PAD
    if (!fits) {
      y += 22
    }
    texts.push(text(fits ? this.width - PAD : PAD, y, progress, `tone-${chapter.tone}`, fits ? 'end' : 'start'))
    if (this.full) {
      y += 6
      for (const line of wrapWords(chapter.caption, charsIn(this.contentWidth, GLYPH.caption))) {
        y += 20
        texts.push(text(PAD, y, line, 'caption'))
      }
    }
    const bottom = y + 14
    this.y = bottom
    return { texts, panel: { x: PAD - 14, y: top, width: this.contentWidth + 28, height: bottom - top } }
  }

  row(stops: readonly JourneyStop[]): void {
    const y = this.y + STOP_DROP
    const { xs, cell } = cellsOf(stops.length, this.width)
    const ordered = this.dir > 0 ? xs : [...xs].reverse()
    const maxChars = charsIn(cell - 12, GLYPH.label)
    let bottom = y
    this.enterAt(y)
    stops.forEach((stop, index) => {
      const x = ordered[index] ?? xs[0] ?? PAD
      const texts = stopTexts(stop, x, y, maxChars)
      this.stopPoint.set(stop.key, this.points.length)
      this.point(x, y)
      this.stops.push({ key: stop.key, stop, chapterId: stop.chapterId, x, y, texts })
      bottom = Math.max(bottom, (texts[texts.length - 1]?.y ?? y) + 14)
    })
    this.point(this.edge(-this.dir), y)
    this.dir = -this.dir
    this.y = bottom
  }

  /** A stage with no missions yet: the road crosses it in pencil, past one pencil mark that says so. */
  plannedRow(chapter: JourneyChapter): SceneStretch {
    const y = this.y + PLANNED_DROP
    const x = Math.round(this.width / 2)
    this.enterAt(y, true)
    this.point(x, y, true)
    this.point(this.edge(-this.dir), y, true)
    this.dir = -this.dir
    const texts = [text(x, y + NUM_DROP, chapter.progress, 'label', 'middle', true)]
    this.y = y + NUM_DROP + 14
    return { x, y, texts }
  }

  /** Where the road ends: the operated network, a router for each family of protocols on one backbone. */
  terminusRow(): void {
    const top = this.y
    let y = top + 28
    const texts = [text(PAD, y, END_WORDS.terminusKicker.toUpperCase(), 'kicker')]
    y += 24
    texts.push(text(PAD, y, END_WORDS.terminusName, 'region'))
    const boxTop = y + 18
    const { routers, gap, boxHeight, busDrop, below } = TERMINUS
    const boxWidth = (this.contentWidth - gap * (routers.length - 1)) / routers.length
    const boxes = routers.map((lines, index) => ({
      x: Math.round(PAD + index * (boxWidth + gap)),
      y: boxTop,
      width: Math.round(boxWidth),
      height: boxHeight,
      lines,
    }))
    const busY = boxTop + busDrop
    y = busY
    if (this.full) {
      for (const line of wrapWords(END_WORDS.terminusCaption, charsIn(this.contentWidth, GLYPH.meta))) {
        y += 16
        texts.push(text(PAD, y, line, 'meta'))
      }
    }
    // The road comes down the side it left the last row on and joins the backbone at that end.
    const side = this.edge(this.dir)
    this.point(side, busY)
    this.point(this.dir > 0 ? PAD : this.width - PAD, busY)
    this.y = y + below
    this.terminus = { top, bottom: this.y, boxes, busY, busLeft: PAD, busRight: this.width - PAD, texts }
  }
}

/** Lays the map out at `width` px, drawn 1:1 so text stays its real size. */
export function layoutMap(chapters: readonly JourneyChapter[], width: number, variant: MapVariant = 'map'): MapScene {
  const b = new Builder(width, variant)
  const sceneChapters: SceneChapter[] = []
  const perRow = perRowAt(width)

  chapters.forEach((chapter, index) => {
    // The first stage's band starts at the sheet's top, so the router it starts from stands in it.
    const top = index === 0 ? 0 : b.y
    if (index === 0) {
      b.originRow()
    }
    const head = b.header(chapter)
    let stretch: SceneStretch | null = null
    if (chapter.planned) {
      stretch = b.plannedRow(chapter)
    } else {
      for (const row of rowsOf(chapter.stops, perRow)) {
        b.row(row)
      }
    }
    b.y += 22
    sceneChapters.push({
      id: chapter.id,
      stage: chapter.stage,
      top,
      bottom: b.y,
      tone: chapter.tone,
      panel: head.panel,
      texts: head.texts,
      stretch,
      name: `Stage ${chapter.stage}: ${chapter.name}`,
      summary: chapter.summary,
    })
  })

  if (chapters.length > 0) {
    b.terminusRow()
  }

  const reachedStop = [...b.stops].reverse().find((stop) => isReached(stop.stop))
  const finished = chapters.length > 0 && chapters.every((chapter) => chapter.tone === 'passed')
  // With every stage passed the road is inked all the way into the network it ends at.
  const split = finished ? b.points.length - 1 : reachedStop ? (b.stopPoint.get(reachedStop.key) ?? 0) : 0
  const hereStop = b.stops.find((stop) => stop.stop.here)

  return {
    variant,
    width,
    height: b.y + TOP,
    chapters: sceneChapters,
    stops: b.stops,
    road: roadOf(b.points, split),
    origin: b.origin,
    terminus: b.terminus,
    here: hereStop ? { key: hereStop.key, x: hereStop.x, y: hereStop.y } : null,
  }
}
