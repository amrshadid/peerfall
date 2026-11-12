import type { ButtonSize, ButtonVariant } from '@shared/types'
import { buttonClass } from '@shared/utils/ui'
import type { AnchorHTMLAttributes } from 'react'
import './Button.css'

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
}

/** For navigation: it goes somewhere, it doesn't do something. */
export function ButtonLink({ variant = 'default', size = 'md', className, ...rest }: ButtonLinkProps) {
  return <a className={buttonClass(variant, size, className)} {...rest} />
}
