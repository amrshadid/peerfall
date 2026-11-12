import { type Route, SETTINGS_SECTIONS, type SettingsSectionId } from '@shared/types/definitions/route'

function isSettingsSection(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

function segmentsOf(hash: string): string[] {
  return hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => decodeURIComponent(segment))
}

/** Hash routes need no server rewrites on a static host. */
export function parseRoute(hash: string): Route {
  const [path = ''] = hash.split('?', 1)
  const [screen, param, extra] = segmentsOf(path)
  if (extra !== undefined) {
    return { name: 'not-found' }
  }
  switch (screen) {
    case undefined:
      return { name: 'title' }
    case 'map':
      return param === undefined ? { name: 'map' } : { name: 'not-found' }
    case 'mission':
      return param === undefined ? { name: 'not-found' } : { name: 'mission', missionId: param }
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
    case 'mission':
      return `#/mission/${encodeURIComponent(route.missionId)}`
    case 'settings':
      return route.section === null ? '#/settings' : `#/settings/${route.section}`
    case 'dev-workspace':
      return '#/dev/workspace'
  }
}
