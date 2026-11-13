import { lazy } from 'react'

export const CodexPage = lazy(() => import('./CodexPage').then((m) => ({ default: m.CodexPage })))
