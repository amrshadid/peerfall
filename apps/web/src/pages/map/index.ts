import { lazy } from 'react'

export const MapPage = lazy(() => import('./MapPage').then((m) => ({ default: m.MapPage })))
