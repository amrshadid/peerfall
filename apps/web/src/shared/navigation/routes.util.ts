import {
  CODEX_PAGES,
  type CodexPageId,
  type Route,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from '@shared/types/definitions/route'

function isSettingsSection(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

function isCodexPage(value: string): value is CodexPageId {
  return (CODEX_PAGES as readonly string[]).includes(value)
}

function segmentsOf(hash: string): string[] {
  return hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => decodeURIComponent(segment))
}

const CARD_PARAM = 'card'
const CHAPTER_SEGMENT = 'chapter'

function codexRoute(param: string | undefined, extra: string | undefined): Route {
  if (param === undefined) {
    return { name: 'codex', cardId: null }
  }
  if (param === CHAPTER_SEGMENT) {
    return extra === undefined ? { name: 'not-found' } : { name: 'codex', cardId: null, chapter: extra }
  }
  if (extra !== undefined) {
    return { name: 'not-found' }
  }
  return isCodexPage(param) ? { name: 'codex', cardId: null, page: param } : { name: 'codex', cardId: param }
}

/** Hash routes need no server rewrites on a static host. */
export function parseRoute(hash: string): Route {
  const [path = '', query] = hash.split('?', 2)
  const [screen, param, extra, beyond] = segmentsOf(path)
  if (beyond !== undefined) {
    return { name: 'not-found' }
  }
  if (screen === 'codex') {
    return codexRoute(param, extra)
  }
  if (extra !== undefined) {
    return { name: 'not-found' }
  }
  switch (screen) {
    case undefined:
      return { name: 'title' }
    case 'map':
      return param === undefined ? { name: 'map' } : { name: 'not-found' }
    case 'mission': {
      if (param === undefined) {
        return { name: 'not-found' }
      }
      const card = new URLSearchParams(query).get(CARD_PARAM)
      return card ? { name: 'mission', missionId: param, card } : { name: 'mission', missionId: param }
    }
    case 'settings':
      if (param === undefined) {
        return { name: 'settings', section: null }
      }
      return isSettingsSection(param) ? { name: 'settings', section: param } : { name: 'not-found' }
    case 'dev':
      return param === 'workspace' ? { name: 'dev-workspace' } : { name: 'not-found' }
    default:
      return { name: 'not-found' }
  }
}

/** The inverse of `parseRoute`. */
export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'title':
    case 'not-found':
      return '#/'
    case 'map':
      return '#/map'
    case 'mission': {
      const mission = `#/mission/${encodeURIComponent(route.missionId)}`
      return route.card === undefined ? mission : `${mission}?${new URLSearchParams({ [CARD_PARAM]: route.card })}`
    }
    case 'codex':
      if (route.page !== undefined) {
        return `#/codex/${route.page}`
      }
      if (route.chapter !== undefined) {
        return `#/codex/${CHAPTER_SEGMENT}/${encodeURIComponent(route.chapter)}`
      }
      return route.cardId === null ? '#/codex' : `#/codex/${encodeURIComponent(route.cardId)}`
    case 'settings':
      return route.section === null ? '#/settings' : `#/settings/${route.section}`
    case 'dev-workspace':
      return '#/dev/workspace'
  }
}
