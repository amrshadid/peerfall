import { lazy } from 'react'

export const MissionPage = lazy(() => import('./MissionPage').then((m) => ({ default: m.MissionPage })))
