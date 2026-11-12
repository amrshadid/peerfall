import type { PanelId, PanelSizes, Settings } from '@shared/types'
import {
  CLARITY_CONSENTS,
  DEFAULT_SETTINGS,
  MAX_TOUR_ID_LENGTH,
  MAX_TOURS_SEEN,
  MOTIONS,
  PANEL_LIMITS,
  THEMES,
  UI_SCALES,
} from './settings.constants'

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Each size inside its limits, else the screen's default. */
export function readPanelSizes(value: unknown): PanelSizes {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const read = (id: PanelId): number | null => {
    const size = raw[id]
    const { min, max } = PANEL_LIMITS[id]
    return typeof size === 'number' && size >= min && size <= max ? size : null
  }
  return { guide: read('guide'), network: read('network'), editor: read('editor') }
}

function readToursSeen(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_SETTINGS.toursSeen
  }
  const ids = value.filter((id): id is string => typeof id === 'string' && id.length < MAX_TOUR_ID_LENGTH)
  return [...new Set(ids)].slice(0, MAX_TOURS_SEEN)
}

/** Field by field, defaulting the invalid ones, so an old or hand-edited value never breaks start-up. */
export function readSettings(stored: unknown): Settings {
  if (typeof stored !== 'object' || stored === null) {
    return DEFAULT_SETTINGS
  }
  const raw = stored as Record<string, unknown>
  return {
    theme: pick(raw.theme, THEMES, DEFAULT_SETTINGS.theme),
    motion: pick(raw.motion, MOTIONS, DEFAULT_SETTINGS.motion),
    uiScale: UI_SCALES.find((step) => step === raw.uiScale) ?? DEFAULT_SETTINGS.uiScale,
    showAllPanels: readBoolean(raw.showAllPanels, DEFAULT_SETTINGS.showAllPanels),
    toursSeen: readToursSeen(raw.toursSeen),
    panelSizes: readPanelSizes(raw.panelSizes),
    clarityConsent: pick(raw.clarityConsent, CLARITY_CONSENTS, DEFAULT_SETTINGS.clarityConsent),
  }
}

/** Every stored version so far has the same fields, so reading them one by one is the whole migration. */
export function migrateSettings(stored: unknown, _version: number): Settings {
  return readSettings(stored)
}

/** Anything unreadable gives the defaults. */
export function parseSettings(json: string | null): Settings {
  if (json === null) {
    return DEFAULT_SETTINGS
  }
  try {
    return readSettings(JSON.parse(json))
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** What is persisted: no actions or per-tab state. */
export function settingsOf(state: Settings): Settings {
  const { theme, motion, uiScale, showAllPanels, toursSeen, panelSizes, clarityConsent } = state
  return { theme, motion, uiScale, showAllPanels, toursSeen, panelSizes, clarityConsent }
}
