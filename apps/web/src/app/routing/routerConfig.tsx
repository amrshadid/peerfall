import type { Route } from '@shared/navigation'
import type { ReactNode } from 'react'
import { CodexPage, DevWorkspacePage, MapPage, MissionPage, NotFoundPage, SettingsPage, TitlePage } from '@/pages'

/** Every area page is a lazy chunk fetched when first visited. */
export function routeElement(route: Route, devRoutes: boolean): ReactNode {
  switch (route.name) {
    case 'title':
      return <TitlePage />
    case 'map':
      return <MapPage />
    case 'mission':
      // A new key per mission: the Machine and the mission's state start fresh.
      return <MissionPage key={route.missionId} missionId={route.missionId} cardId={route.card ?? null} />
    case 'codex':
      return <CodexPage cardId={route.cardId} chapter={route.chapter ?? null} page={route.page ?? null} />
    case 'settings':
      return <SettingsPage section={route.section} />
    case 'dev-workspace':
      // A build has no dev pages at all, so the address is simply unknown there.
      return devRoutes && DevWorkspacePage ? <DevWorkspacePage /> : <NotFoundPage />
    case 'not-found':
      return <NotFoundPage />
  }
}
