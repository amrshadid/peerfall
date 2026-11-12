import { parseRoute } from '@shared/navigation'
import type { Route } from '@shared/types/definitions/route'
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = () => window.location.hash

export function useHashRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, getHash))
}
