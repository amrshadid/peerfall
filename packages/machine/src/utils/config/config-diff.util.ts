// What the Machine writes or FRR prints itself: never the player's to add or remove.
const MANAGED = [
  /^frr version /,
  /^frr defaults /,
  /^hostname /,
  /^log file /,
  /^log timestamp precision /,
  /^service integrated-vtysh-config$/,
]
// Lines that close a block or separate blocks: structure, not configuration.
const STRUCTURE = /^(!|exit|exit-address-family|exit-vrf|exit-vni|end|)$/

/** One configuration line and the blocks it sits in, outermost first: `['interface a-c']` + `ip ospf bfd`. */
export interface ConfigEntry {
  readonly context: readonly string[]
  readonly line: string
}

const keyOf = ({ context, line }: ConfigEntry): string => [...context, line].join('\n')

/**
 * A configuration as its lines, each with its blocks. FRR indents a block's lines by one space
 * per level, in `show running-config` and in frr.conf alike, so the indent says where a line
 * belongs; a line with a deeper one after it opens a block.
 */
export function configEntries(text: string): ConfigEntry[] {
  const lines = text
    .split('\n')
    .map((raw) => ({ indent: raw.length - raw.trimStart().length, line: raw.trim() }))
    .filter(({ line }) => !STRUCTURE.test(line))
  const entries: ConfigEntry[] = []
  const open: { indent: number; line: string }[] = []
  lines.forEach(({ indent, line }, at) => {
    while (open.length > 0 && (open.at(-1)?.indent ?? 0) >= indent) {
      open.pop()
    }
    const context = open.map((block) => block.line)
    const opensBlock = (lines[at + 1]?.indent ?? 0) > indent
    if (opensBlock) {
      open.push({ indent, line })
    }
    if (context.length === 0 && MANAGED.some((managed) => managed.test(line))) {
      return
    }
    // A block's own line is an entry too: `router ospf` with nothing in it still starts OSPF.
    entries.push({ context, line })
  })
  return entries
}

const negated = (line: string): string => (line.startsWith('no ') ? line.slice(3) : `no ${line}`)

/**
 * The vtysh commands, after `configure terminal`, that turn the `current` configuration into
 * `wanted`: what frr-reload does on a real router. Lines that are gone are negated in their
 * block, a block that is gone is negated whole, new lines are entered in their block. Each
 * group of commands starts from the top, so a block left open never catches the next one.
 */
export function configChanges(current: string, wanted: string): string[][] {
  const before = configEntries(current)
  const after = configEntries(wanted)
  const had = new Set(before.map(keyOf))
  const wants = new Set(after.map(keyOf))
  const groups: { context: readonly string[]; commands: string[] }[] = []
  const add = (context: readonly string[], command: string) => {
    const last = groups.at(-1)
    // The same block as the command before: one more line in it.
    if (last && last.context.join('\n') === context.join('\n')) {
      last.commands.push(command)
    } else {
      groups.push({ context, commands: [command] })
    }
  }

  const removedBlocks = new Set<string>()
  for (const entry of before) {
    if (wants.has(keyOf(entry))) {
      continue
    }
    // Inside a block that is going away whole: removing the block removes it.
    const within = entry.context.some((_, depth) => removedBlocks.has(entry.context.slice(0, depth + 1).join('\n')))
    if (within) {
      continue
    }
    const opensBlock = before.some((other) => other.context.join('\n') === keyOf(entry))
    if (opensBlock) {
      removedBlocks.add(keyOf(entry))
    }
    add(entry.context, negated(entry.line))
  }
  for (const entry of after) {
    if (!had.has(keyOf(entry))) {
      add(entry.context, entry.line)
    }
  }
  return groups.map(({ context, commands }) => [...context, ...commands])
}

const CONFIG_START = 'Current configuration:'

/** `show running-config` without what vtysh says around it: the text an editor shows. */
export function runningConfigText(output: string): string {
  const text = output.replaceAll('\r', '')
  const start = text.indexOf(CONFIG_START)
  const body = (start === -1 ? text : text.slice(start + CONFIG_START.length)).trim()
  return `${body
    .replace(/\nend$/, '')
    .replace(/^!\n/, '')
    .trimEnd()}\n`
}

/** FRR's complaints in vtysh's output: lines that start with `%`, each once. */
export function configErrors(output: string): string[] {
  return [
    ...new Set(
      output
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('%'))
    ),
  ]
}

const quoted = (text: string): string => `'${text.replace(/'/g, `'\\''`)}'`

/** Root's line that asks a router for its running configuration. */
export const configReadLine = (router: string): string => `vtysh -N ${router} -c 'show running-config'`

/**
 * Root's line that types the changes into a router's vtysh. Each group starts over from
 * `configure terminal`, so one group's block is closed before the next begins.
 */
export function configApplyLine(router: string, changes: readonly (readonly string[])[]): string {
  const commands = changes.flatMap((group) => ['configure terminal', ...group, 'end'])
  return `vtysh -N ${router} ${commands.map((command) => `-c ${quoted(command)}`).join(' ')}`
}
