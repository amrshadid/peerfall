import { ICON_PATHS as PATHS } from '@shared/constants/icons'
import './Icon.css'

export type IconName = keyof typeof PATHS

export interface IconProps {
  name: IconName
  /** Rendered size in px; the drawing sits on a 24px grid with a 2px stroke. */
  size?: number
}

/** Always decorative: the caller gives a visible label or an aria-label. */
export function Icon({ name, size = 18 }: IconProps) {
  return (
    <svg className="pf-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
