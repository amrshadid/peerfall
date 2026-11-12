import type { NonEmptyList, StringRule, Validated } from '#types/definitions/validation'
import { describeType, isRecord, joinPath } from '#utils/validation/value.util'

/** Collects readable validation errors so a content author sees all of them at once. */
export class Issues {
  readonly #errors: string[] = []

  add(path: string, message: string): void {
    this.#errors.push(path === '' ? message : `${path}: ${message}`)
  }

  /** Lets a reader tell whether one entry added errors, to leave it out of later checks. */
  get count(): number {
    return this.#errors.length
  }

  /** Wraps `value` as valid only if no error was recorded. */
  result<T>(value: T): Validated<T> {
    return this.#errors.length === 0 ? { ok: true, value } : { ok: false, errors: [...this.#errors] }
  }
}

/**
 * Reads typed fields from untrusted data (parsed YAML or JSON, an old save).
 *
 * Every read records an error in `issues` instead of throwing, and returns a
 * harmless placeholder so reading can go on and report every problem. Use the
 * values only when `issues` stays empty.
 */
export class ObjectReader {
  readonly #record: Readonly<Record<string, unknown>>
  readonly #path: string
  readonly #issues: Issues

  constructor(value: unknown, path: string, issues: Issues) {
    this.#path = path
    this.#issues = issues
    if (isRecord(value)) {
      this.#record = value
      return
    }
    issues.add(path, `expected an object, got ${describeType(value)}`)
    this.#record = {}
  }

  get issues(): Issues {
    return this.#issues
  }

  /** Where this object sits in the file, e.g. `objectives[2].check`. */
  get path(): string {
    return this.#path
  }

  pathOf(key: string | number): string {
    return joinPath(this.#path, key)
  }

  /** Reports fields that aren't in `known`; they are usually typos. */
  rejectUnknownKeys(known: readonly string[]): void {
    for (const key of Object.keys(this.#record)) {
      if (!known.includes(key)) {
        this.#issues.add(this.pathOf(key), `unknown field (expected one of: ${known.join(', ')})`)
      }
    }
  }

  /** The field as it is, for a part another validator reads (a level's `lab:` block). */
  value(key: string): unknown {
    return this.#record[key]
  }

  string(key: string, rule?: StringRule): string {
    return checkString(this.#record[key], this.pathOf(key), this.#issues, rule)
  }

  /** Text compared as is: unlike `string`, empty or whitespace-only text (a lone newline) is allowed. */
  text(key: string): string {
    const value = this.#record[key]
    if (typeof value !== 'string') {
      this.#issues.add(this.pathOf(key), `expected text, got ${describeType(value)}`)
      return ''
    }
    return value
  }

  integer(key: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
    const value = this.#record[key]
    const path = this.pathOf(key)
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      this.#issues.add(path, `expected a whole number, got ${describeType(value)}`)
      return min
    }
    if (value < min || value > max) {
      this.#issues.add(path, `expected a number from ${min} to ${max}, got ${value}`)
    }
    return value
  }

  /** An optional yes/no field: left out, it is false. */
  flag(key: string): boolean {
    const value = this.#record[key]
    if (value === undefined || typeof value === 'boolean') {
      return value === true
    }
    this.#issues.add(this.pathOf(key), `expected true or false, got ${describeType(value)}`)
    return false
  }

  oneOf<T extends string>(key: string, allowed: NonEmptyList<T>): T {
    return checkOneOf(this.#record[key], this.pathOf(key), this.#issues, allowed)
  }

  /** Reads a list; each item is handed to `item` with its own path. */
  list<T>(key: string, item: (value: unknown, path: string) => T): readonly T[] {
    const value = this.#record[key]
    const path = this.pathOf(key)
    if (!Array.isArray(value)) {
      this.#issues.add(path, `expected a list, got ${describeType(value)}`)
      return []
    }
    return value.map((entry: unknown, index) => item(entry, joinPath(path, index)))
  }

  stringList(key: string, rule?: StringRule): readonly string[] {
    return this.list(key, (value, path) => checkString(value, path, this.#issues, rule))
  }

  /** Invalid entries are reported and left out, so they don't also show up as duplicates. */
  oneOfList<T extends string>(key: string, allowed: NonEmptyList<T>): readonly T[] {
    return this.list(key, (value, path) => findOption(value, path, this.#issues, allowed)).filter(
      (value) => value !== undefined
    )
  }

  /** Returns `null` for a `null` field, otherwise reads it with `read`. */
  nullable<T>(key: string, read: (key: string) => T): T | null {
    return this.#record[key] === null ? null : read(key)
  }

  /** Reads the field with `read` only if it is there, so a left-out optional field stays `undefined`. */
  optional<T>(key: string, read: (key: string) => T): T | undefined {
    return this.has(key) ? read(key) : undefined
  }

  /** Whether the field is there at all: optional fields are read only if it is. */
  has(key: string): boolean {
    return Object.hasOwn(this.#record, key)
  }

  /** A map of text values; unlike `string`, empty text is allowed (an empty file). */
  textMap(key: string): Readonly<Record<string, string>> {
    const value = this.#record[key]
    const path = this.pathOf(key)
    if (!isRecord(value)) {
      this.#issues.add(path, `expected an object, got ${describeType(value)}`)
      return {}
    }
    const map: Record<string, string> = {}
    for (const [name, text] of Object.entries(value)) {
      if (typeof text === 'string') {
        map[name] = text
      } else {
        this.#issues.add(joinPath(path, name), `expected text, got ${describeType(text)}`)
      }
    }
    return map
  }

  object(key: string): ObjectReader {
    return new ObjectReader(this.#record[key], this.pathOf(key), this.#issues)
  }
}

function checkString(value: unknown, path: string, issues: Issues, rule?: StringRule): string {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.add(path, `expected non-empty text, got ${describeType(value)}`)
    return ''
  }
  if (rule && !rule.pattern.test(value)) {
    issues.add(path, `expected ${rule.expected}, got "${value}"`)
  }
  return value
}

function checkOneOf<T extends string>(value: unknown, path: string, issues: Issues, allowed: NonEmptyList<T>): T {
  return findOption(value, path, issues, allowed) ?? allowed[0]
}

function findOption<T extends string>(
  value: unknown,
  path: string,
  issues: Issues,
  allowed: NonEmptyList<T>
): T | undefined {
  const match = allowed.find((option) => option === value)
  if (match === undefined) {
    issues.add(path, `expected one of ${allowed.join(', ')}, got ${JSON.stringify(value)}`)
  }
  return match
}

/** Reports each value that appears more than once: a name as `"ada"`, an id as `1000`. */
export function reportDuplicates(values: readonly (string | number)[], path: string, issues: Issues): void {
  const seen = new Set<string | number>()
  for (const value of values) {
    if (seen.has(value)) {
      issues.add(path, `${JSON.stringify(value)} appears more than once`)
    }
    seen.add(value)
  }
}
