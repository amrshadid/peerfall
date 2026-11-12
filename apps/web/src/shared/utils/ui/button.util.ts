import type { ButtonSize, ButtonVariant } from '@shared/types'

/** The kit's button classes, shared by `Button` and `ButtonLink` so a link looks exactly like a button. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize, extra: string | undefined): string {
  return ['pf-btn', `pf-btn--${variant}`, `pf-btn--${size}`, extra].filter(Boolean).join(' ')
}
