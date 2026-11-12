const STARTS_WITH_VOWEL = /^[aeiou]/

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** How an error message names what it got: `nothing`, `empty text`, `a list`, `an object`… */
export function describeType(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'nothing'
  }
  if (typeof value === 'string') {
    return value.trim() === '' ? 'empty text' : 'text'
  }
  if (Array.isArray(value)) {
    return 'a list'
  }
  const type = typeof value
  return `${STARTS_WITH_VOWEL.test(type) ? 'an' : 'a'} ${type}`
}

export function joinPath(path: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${path}[${key}]`
  }
  return path === '' ? key : `${path}.${key}`
}
