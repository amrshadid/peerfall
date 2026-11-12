import type { LoadedContent } from '@peerfall/missions/types'
import { APP_NAME as APP, APP_TAGLINE as TAGLINE } from '@shared/constants/app'
import type { Route } from '@shared/types/definitions/route'

const SMALL_SCREEN_TITLE = `Needs a bigger screen · ${APP}`
const CONTENT_ERROR_TITLE = `Content errors · ${APP}`

/** `content` is null when it failed its checks; below the play width every route shows the small-screen wall. */
export function screenTitleOf(route: Route, content: LoadedContent | null, wide: boolean): string {
  if (content === null) {
    return CONTENT_ERROR_TITLE
  }
  return wide ? documentTitleOf(route, content) : SMALL_SCREEN_TITLE
}

/** Most specific part first, so a narrow tab still says which screen or mission it is. */
export function documentTitleOf(route: Route, content: LoadedContent): string {
  switch (route.name) {
    case 'title':
      return `${APP}: ${TAGLINE}`
    case 'map':
      return `Map · ${APP}`
    case 'mission':
      return `${content.game.mission(route.missionId)?.title ?? 'Mission'} · ${APP}`
    case 'settings':
      return `Settings · ${APP}`
    case 'dev-workspace':
      return `Workspace fixtures · ${APP}`
    case 'not-found':
      return `Page not found · ${APP}`
  }
}
