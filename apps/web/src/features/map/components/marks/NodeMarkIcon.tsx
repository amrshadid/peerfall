import type { StopState } from '@features/map/types'
import { NodeMark } from './NodeMark'

export interface NodeMarkIconProps {
  state: StopState
  planned?: boolean
}

export function NodeMarkIcon({ state, planned = false }: NodeMarkIconProps) {
  return (
    <svg className="pf-node-icon" viewBox="-17 -17 34 34" aria-hidden="true">
      <NodeMark state={state} planned={planned} />
    </svg>
  )
}
