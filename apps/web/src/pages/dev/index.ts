import { lazy } from 'react'

// Null in a build: the condition is a constant there, so the page and its fixtures never reach the bundle.
export const DevWorkspacePage = import.meta.env.DEV
  ? lazy(() => import('./DevWorkspacePage').then((m) => ({ default: m.DevWorkspacePage })))
  : null
