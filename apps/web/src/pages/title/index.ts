import { lazy } from 'react'

export const TitlePage = lazy(() => import('./TitlePage').then((m) => ({ default: m.TitlePage })))
