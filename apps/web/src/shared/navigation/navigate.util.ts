import type { Route } from '@shared/types/definitions/route'
import { hrefOf } from './routes.util'

export function navigateTo(route: Route): void {
  window.location.hash = hrefOf(route)
}
