import type { ObjectReader } from '@peerfall/core/utils'
import { CHECK_KINDS, type CheckDefinition, type CheckKind, DETECTION_EVENTS } from '#types/definitions/checks'

/** The fields each kind of check takes besides `kind`; anything else is reported as a typo. */
const CHECK_FIELDS: Readonly<Record<CheckKind, readonly string[]>> = {
  reachable: ['minReplies'],
  path: ['before', 'after'],
  recovery: ['via', 'withinMs'],
  outage: ['maxMs'],
  'detected-by': ['event'],
}

/** Reads an objective's `check:` block. Whether its interfaces exist is the mission's to check. */
export function readCheck(check: ObjectReader): CheckDefinition {
  const problemsSoFar = check.issues.count
  const kind = check.oneOf('kind', CHECK_KINDS)
  // With no kind to go by, the other fields can't be told from typos.
  if (check.issues.count > problemsSoFar) {
    return { kind: 'reachable', minReplies: 1 }
  }
  check.rejectUnknownKeys(['kind', ...CHECK_FIELDS[kind]])
  const limit = (key: string) => check.optional(key, (name) => check.integer(name, 1))
  switch (kind) {
    case 'reachable':
      return { kind, minReplies: limit('minReplies') ?? 1 }
    case 'path': {
      const before = check.optional('before', (key) => check.string(key))
      const after = check.optional('after', (key) => check.string(key))
      if (before === undefined && after === undefined) {
        check.issues.add(check.path, 'expected "before", "after" or both: the interface traffic must leave through')
      }
      return { kind, ...(before !== undefined && { before }), ...(after !== undefined && { after }) }
    }
    case 'recovery': {
      const withinMs = limit('withinMs')
      return { kind, via: check.string('via'), ...(withinMs !== undefined && { withinMs }) }
    }
    case 'outage': {
      const maxMs = limit('maxMs')
      return { kind, ...(maxMs !== undefined && { maxMs }) }
    }
    case 'detected-by':
      return { kind, event: check.oneOf('event', DETECTION_EVENTS) }
  }
}

/** The interfaces a check names, each with the field that names it. */
export function checkInterfaces(check: CheckDefinition): readonly { readonly field: string; readonly name: string }[] {
  if (check.kind === 'path') {
    return [
      ...(check.before === undefined ? [] : [{ field: 'before', name: check.before }]),
      ...(check.after === undefined ? [] : [{ field: 'after', name: check.after }]),
    ]
  }
  return check.kind === 'recovery' ? [{ field: 'via', name: check.via }] : []
}
