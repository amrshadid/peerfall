import type { SizeLimits } from '@shared/types'

/** Sizes are kept to two decimals: enough for a pixel at any text size, short in the saved settings. */
const PRECISION = 100

export function clampSize(size: number, { min, max }: SizeLimits): number {
  return Math.round(Math.min(max, Math.max(min, size)) * PRECISION) / PRECISION
}

// Rounded up, so a panel at its minimum still fits what it needs; the maximum moves along so the range stays valid.
export function limitsAtLeast(limits: SizeLimits, needed: number | null): SizeLimits {
  if (needed === null || !Number.isFinite(needed) || needed <= limits.min) {
    return limits
  }
  const min = Math.ceil(needed * PRECISION) / PRECISION
  return { min, max: Math.max(limits.max, min) }
}

/**
 * The size after dragging the divider `deltaPx` pixels. `direction` is 1 when dragging
 * right or down grows the panel, -1 when it shrinks it (a panel on the right or below).
 */
export function draggedSize(
  start: number,
  deltaPx: number,
  pxPerUnit: number,
  direction: 1 | -1,
  limits: SizeLimits
): number {
  return clampSize(start + (direction * deltaPx) / pxPerUnit, limits)
}

/** The size a key moves the divider to, or null for a key it ignores. */
export function keyedSize(
  current: number,
  key: string,
  step: number,
  direction: 1 | -1,
  limits: SizeLimits
): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return clampSize(current + direction * step, limits)
    case 'ArrowLeft':
    case 'ArrowUp':
      return clampSize(current - direction * step, limits)
    case 'Home':
      return limits.min
    case 'End':
      return limits.max
    default:
      return null
  }
}
