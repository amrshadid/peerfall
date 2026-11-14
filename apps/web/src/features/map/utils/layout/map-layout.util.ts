import type {
  JourneyChapter,
  JourneyRegion,
  JourneyStop,
  MapScene,
  MapVariant,
  SceneChapter,
  ScenePoint,
  SceneRect,
  SceneRegion,
  SceneStop,
  SceneTerminus,
  SceneText,
  TextStyle,
} from '@features/map/types'
import { isReached, PLANNED_STOP } from '@features/map/utils/journey'
import { roadOf } from '@features/map/utils/marks'
import { partsLine } from '@features/map/utils/parts'
import { cellsOf, perRowAt, rowsOf } from './map-grid.util'
import { EDGE, LINE, NUM_DROP, PAD, STOP_DROP, TERMINUS, TOP } from './map-layout.constants'
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
  const tag = stop.planned ? ` · ${PLANNED_STOP.tag}` : ''
  return [
    text(x, y + NUM_DROP, `${stop.number}${tag}`, 'num', 'middle', dim),
    ...stopLines(stop.title, maxChars).map((line, index) =>
      text(x, y + NUM_DROP + LINE * (index + 1), line, 'label', 'middle', dim)
    ),
  ]
}

class Builder {
  y = TOP
  /** +1: the next row runs left to right. */
  dir = 1
  readonly points: ScenePoint[] = []
  readonly stopPoint = new Map<string, number>()
  readonly stops: SceneStop[] = []
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

  /** The road comes down the side it left the last row on, then turns along this row. */
  enterAt(y: number): void {
    this.points.push({ x: this.edge(this.dir), y })
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
    texts.push(text(PAD, y, chapter.name, 'zone'))
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
      const parts = partsLine(chapter.parts)
      if (parts !== null) {
        y += 4
        for (const line of wrapWords(parts, charsIn(this.contentWidth, GLYPH.mono))) {
          y += 17
          texts.push(text(PAD, y, line, 'mono'))
        }
      }
    }
    const bottom = y + 14
    this.y = bottom
    return { texts, panel: { x: PAD - 14, y: top, width: this.contentWidth + 28, height: bottom - top } }
  }

  /** A region's name and progress, then what it covers and its guide, then its place in FRR's source. */
  regionHead(region: JourneyRegion): SceneText[] {
    const texts: SceneText[] = []
    let y = this.y + 34
    texts.push(text(PAD, y, region.name, 'region'))
    const fits =
      PAD + textWidth(region.name, GLYPH.region) + 20 + textWidth(region.progress, GLYPH.meta) <= this.width - PAD
    if (!fits) {
      y += 17
    }
    texts.push(text(fits ? this.width - PAD : PAD, y, region.progress, `tone-${region.tone}`, fits ? 'end' : 'start'))
    if (this.full) {
      for (const line of wrapWords(
        `${region.caption} · guide: ${region.guide}`,
        charsIn(this.contentWidth, GLYPH.meta)
      )) {
        y += 16
        texts.push(text(PAD, y, line, 'meta'))
      }
      for (const line of wrapWords(region.source, charsIn(this.contentWidth, GLYPH.mono))) {
        y += 16
        texts.push(text(PAD, y, line, 'mono'))
      }
    }
    this.y = y
    return texts
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
      this.points.push({ x, y })
      this.stops.push({ key: stop.key, stop, chapterId: stop.chapterId, x, y, texts })
      bottom = Math.max(bottom, (texts[texts.length - 1]?.y ?? y) + 14)
    })
    this.points.push({ x: this.edge(-this.dir), y })
    this.dir = -this.dir
    this.y = bottom
  }

  /** Under the last stage: the operated network, a router for each family of protocols on one backbone. */
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
    this.y = y + below
    this.terminus = { top, bottom: this.y, boxes, busY, busLeft: PAD, busRight: this.width - PAD, texts }
  }
}

/** Lays the map out at `width` px, drawn 1:1 so text stays its real size. */
export function layoutMap(chapters: readonly JourneyChapter[], width: number, variant: MapVariant = 'map'): MapScene {
  const b = new Builder(width, variant)
  const sceneChapters: SceneChapter[] = []
  const perRow = perRowAt(width)

  for (const chapter of chapters) {
    const top = b.y
    const head = b.header(chapter)
    const regions: SceneRegion[] = []
    for (const region of chapter.regions) {
      const regionTop = b.y
      const texts = b.regionHead(region)
      for (const row of rowsOf(region.stops, perRow)) {
        b.row(row)
      }
      regions.push({ key: region.key, texts, top: regionTop, bottom: b.y })
    }
    // A stage with no missions yet keeps its place on the road: one planned stop. Missions no region
    // lists, which only a test's content has, follow on the stage's own road.
    const grouped = new Set(chapter.regions.flatMap((region) => region.stops.map((stop) => stop.key)))
    for (const row of rowsOf(
      chapter.marks.filter((stop) => !grouped.has(stop.key)),
      perRow
    )) {
      b.row(row)
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
      regions,
      name: `Stage ${chapter.stage}: ${chapter.name}`,
      summary: chapter.summary,
    })
  }

  if (chapters.length > 0) {
    b.terminusRow()
  }

  // The road ends at the last stop, not at the sheet's edge.
  const points = b.points.slice(0, -1)
  const reachedStop = [...b.stops].reverse().find((stop) => isReached(stop.stop))
  const split = reachedStop ? (b.stopPoint.get(reachedStop.key) ?? 0) : 0
  const hereStop = b.stops.find((stop) => stop.stop.here)

  return {
    variant,
    width,
    height: b.y + TOP,
    chapters: sceneChapters,
    stops: b.stops,
    road: roadOf(points, split),
    start: points[0] ?? null,
    terminus: b.terminus,
    here: hereStop ? { key: hereStop.key, x: hereStop.x, y: hereStop.y } : null,
  }
}
