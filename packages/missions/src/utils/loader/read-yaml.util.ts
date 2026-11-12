import type { Validated } from '@peerfall/core/types'
import { parse } from 'yaml'

/** Parses and validates one YAML file; null after adding its problems, prefixed with `path`, to `errors`. */
export function readYaml<T>(
  text: string,
  path: string,
  validate: (input: unknown) => Validated<T>,
  errors: string[]
): T | null {
  let input: unknown
  try {
    input = parse(text)
  } catch (error) {
    errors.push(`${path}: not valid YAML (${error instanceof Error ? error.message : String(error)})`)
    return null
  }
  const result = validate(input)
  if (!result.ok) {
    errors.push(...result.errors.map((error) => `${path}: ${error}`))
    return null
  }
  return result.value
}
