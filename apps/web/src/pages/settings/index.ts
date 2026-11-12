import { lazy } from 'react'

export const SettingsPage = lazy(() => import('./SettingsPage').then((m) => ({ default: m.SettingsPage })))
