import { describe, expect, it } from 'vitest'
import { Issues, ObjectReader, reportDuplicates } from '#utils/validation/object-reader.util'

function errorsOf(issues: Issues): readonly string[] {
  const result = issues.result(null)
  return result.ok ? [] : result.errors
}

describe('ObjectReader', () => {
  it('reads valid fields without recording issues', () => {
    const issues = new Issues()
    const reader = new ObjectReader(
      { name: 'ls', count: 3, kind: 'b', tags: ['x', 'y'], files: { 'a.c': '' }, gone: null },
      'root',
      issues
    )

    expect(reader.string('name')).toBe('ls')
    expect(reader.integer('count', 0, 5)).toBe(3)
    expect(reader.oneOf('kind', ['a', 'b'])).toBe('b')
    expect(reader.stringList('tags')).toEqual(['x', 'y'])
    expect(reader.textMap('files')).toEqual({ 'a.c': '' })
    expect(reader.nullable('gone', (key) => reader.string(key))).toBeNull()
    expect(issues.result('ok')).toEqual({ ok: true, value: 'ok' })
  })

  it('reports every problem with its path and keeps reading', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ name: '', count: 9, kind: 'z', extra: 1 }, 'root', issues)

    expect(reader.string('name')).toBe('')
    expect(reader.integer('count', 0, 5)).toBe(9)
    expect(reader.oneOf('kind', ['a', 'b'])).toBe('a')
    reader.rejectUnknownKeys(['name', 'count', 'kind'])

    expect(errorsOf(issues)).toEqual([
      'root.name: expected non-empty text, got empty text',
      'root.count: expected a number from 0 to 5, got 9',
      'root.kind: expected one of a, b, got "z"',
      'root.extra: unknown field (expected one of: name, count, kind)',
    ])
    expect(issues.count).toBe(4)
  })

  it('checks text against a rule and names what it expected', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ id: 'Fork' }, 'level', issues)

    reader.string('id', { pattern: /^[a-z-]+$/, expected: 'kebab-case like fork-exec' })

    expect(errorsOf(issues)).toEqual(['level.id: expected kebab-case like fork-exec, got "Fork"'])
  })

  it("reports a value that isn't an object", () => {
    const issues = new Issues()
    new ObjectReader([], 'save', issues)

    expect(errorsOf(issues)).toEqual(['save: expected an object, got a list'])
  })

  it('leaves invalid entries out of a oneOfList', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ views: ['a', 'q', 'b'] }, '', issues)

    expect(reader.oneOfList('views', ['a', 'b'])).toEqual(['a', 'b'])
    expect(errorsOf(issues)).toEqual(['views[1]: expected one of a, b, got "q"'])
  })

  it('hands a field over as it is, for another validator to read', () => {
    const issues = new Issues()
    const lab = { cpus: 'two' }
    const reader = new ObjectReader({ lab }, '', issues)

    expect(reader.value('lab')).toBe(lab)
    expect(reader.value('missing')).toBeUndefined()
    expect(errorsOf(issues)).toEqual([])
  })

  it('reads an optional field only when it is there', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ cpus: 2 }, 'lab', issues)

    expect(reader.optional('cpus', (key) => reader.integer(key, 1))).toBe(2)
    expect(reader.optional('cwd', (key) => reader.string(key))).toBeUndefined()
    expect(errorsOf(issues)).toEqual([])
  })

  it('reads text as is, empty or a lone newline included, but only text', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ empty: '', newline: '\n', count: 3 }, 'match', issues)

    expect(reader.text('empty')).toBe('')
    expect(reader.text('newline')).toBe('\n')
    expect(reader.text('count')).toBe('')
    expect(errorsOf(issues)).toEqual(['match.count: expected text, got a number'])
  })

  it('reads a flag left out as false and reports one that is not true or false', () => {
    const issues = new Issues()
    const reader = new ObjectReader({ boss: true, optional: false, quoted: 'yes' }, 'region', issues)

    expect(reader.flag('boss')).toBe(true)
    expect(reader.flag('optional')).toBe(false)
    expect(reader.flag('missing')).toBe(false)
    expect(reader.flag('quoted')).toBe(false)
    expect(errorsOf(issues)).toEqual(['region.quoted: expected true or false, got text'])
  })

  it('knows its own path, so nested readers report where they sit in the file', () => {
    const issues = new Issues()
    const check = new ObjectReader({ objectives: [{ check: {} }] }, '', issues)
      .list('objectives', (value, path) => new ObjectReader(value, path, issues))[0]
      ?.object('check')

    expect(check?.path).toBe('objectives[0].check')
    expect(check?.pathOf('kind')).toBe('objectives[0].check.kind')
  })
})

describe('reportDuplicates', () => {
  it('reports each repeated name, quoted', () => {
    const issues = new Issues()
    reportDuplicates(['a', 'b', 'a'], 'skills', issues)

    expect(errorsOf(issues)).toEqual(['skills: "a" appears more than once'])
  })

  it('reports a repeated id as a bare number', () => {
    const issues = new Issues()
    reportDuplicates([0, 1000, 1000], 'lab.users', issues)

    expect(errorsOf(issues)).toEqual(['lab.users: 1000 appears more than once'])
  })
})
