import type { ReactNode } from 'react'

/** One section of a man page: `NAME`, `DESCRIPTION`, `SEE ALSO`. */
export interface ManPageSection {
  readonly name: string
  readonly body: ReactNode
}
