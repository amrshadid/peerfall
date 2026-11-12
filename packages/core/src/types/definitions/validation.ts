/** A checked value, or every problem found, each prefixed with the path to the bad field. */
export type Validated<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] }

export type NonEmptyList<T> = readonly [T, ...T[]]

export interface StringRule {
  readonly pattern: RegExp
  /** Shown when the pattern doesn't match, e.g. "kebab-case like fork-exec". */
  readonly expected: string
}
