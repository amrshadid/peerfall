import type { ChapterId } from '@peerfall/game/types'
import type { JourneyStop, Tone } from './journey'
import type { MarkPoint, RoadShape } from './marks'

/** `overview` is Fig. 1 on the title page: the same drawing, headers cut to name and progress. */
export type MapVariant = 'map' | 'overview'

/** The part of the drawing an overview shows, in drawing px. */
export interface OverviewWindow {
  readonly top: number
  readonly height: number
  /** More drawing lies above or below the window: that edge fades out. */
  readonly fadeTop: boolean
  readonly fadeBottom: boolean
}

/** A text style of the drawing; the component maps it to a class. */
export type TextStyle =
  | 'kicker'
  | 'zone'
  | 'caption'
  | 'meta'
  | 'region'
  | 'num'
  | 'label'
  | 'tone-passed'
  | 'tone-progress'
  | 'tone-ahead'
  | 'tone-planned'

export interface SceneText {
  readonly x: number
  readonly y: number
  readonly text: string
  readonly style: TextStyle
  readonly anchor: 'start' | 'middle' | 'end'
  /** Pencil grey: locked or planned. */
  readonly dim: boolean
}

export type ScenePoint = MarkPoint

export interface SceneRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface SceneStop {
  readonly key: string
  readonly stop: JourneyStop
  readonly chapterId: ChapterId
  readonly x: number
  readonly y: number
  readonly texts: readonly SceneText[]
}

/** The pencilled stretch of road through a stage with no missions yet. */
export interface SceneStretch {
  /** Where its pencil mark sits on the road. */
  readonly x: number
  readonly y: number
  readonly texts: readonly SceneText[]
}

export interface SceneChapter {
  readonly id: ChapterId
  readonly stage: number
  readonly top: number
  readonly bottom: number
  readonly tone: Tone
  /** The sheet the header is printed on, over the hatching. */
  readonly panel: SceneRect
  readonly texts: readonly SceneText[]
  /** null for a stage that has missions. */
  readonly stretch: SceneStretch | null
  /** The group's accessible name; its printed words follow as the summary. */
  readonly name: string
  readonly summary: string
}

/** Where the journey starts: one router, above the first stage. */
export interface SceneOrigin {
  readonly box: SceneRect
  readonly texts: readonly SceneText[]
}

/** Where the journey ends: an operated network, its routers on one backbone, under the last stage. */
export interface SceneTerminus {
  readonly top: number
  readonly bottom: number
  readonly boxes: readonly (SceneRect & { readonly lines: readonly string[] })[]
  readonly busY: number
  readonly busLeft: number
  readonly busRight: number
  readonly texts: readonly SceneText[]
}

export interface MapScene {
  readonly variant: MapVariant
  readonly width: number
  readonly height: number
  readonly chapters: readonly SceneChapter[]
  /** In travel order: the order arrow keys walk. */
  readonly stops: readonly SceneStop[]
  /** SVG path data: the road up to the farthest stop in reach, and the road ahead. */
  readonly road: RoadShape
  readonly origin: SceneOrigin | null
  readonly terminus: SceneTerminus | null
  readonly here: (ScenePoint & { readonly key: string }) | null
}
