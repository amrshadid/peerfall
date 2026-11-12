import type { ButtonSize, ButtonVariant } from '@shared/types'
import { buttonClass } from '@shared/utils/ui'
import type { ButtonHTMLAttributes, Ref } from 'react'
import './Button.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  ref?: Ref<HTMLButtonElement>
}

/** `primary` is the one signal-red action on a screen. */
export function Button({ variant = 'default', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />
}
