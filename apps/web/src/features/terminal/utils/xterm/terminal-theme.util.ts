import type { ITheme, Terminal } from '@xterm/xterm'

const DARK_SCHEME = '(prefers-color-scheme: dark)'

/** Section 2 "Day print" values, used where the page hasn't defined the tokens. */
const DAY_PRINT: Readonly<Record<string, string>> = {
  '--soft': '#e5e5df',
  '--ink': '#141414',
  '--ink-2': '#55554f',
  '--red': '#c8201a',
  '--on-red': '#fafaf7',
  '--blue': '#1f4fa3',
  '--green': '#1d6b3a',
  '--taint': '#a3195b',
  '--code-pre': '#7a4a00',
}

/** xterm.js needs concrete colours, not CSS variables. */
export function terminalTheme(readToken: (name: string) => string): ITheme {
  const token = (name: string): string => readToken(name).trim() || (DAY_PRINT[name] ?? '')
  const ink = token('--ink')
  const paper = token('--soft')
  return {
    background: paper,
    foreground: ink,
    cursor: ink,
    cursorAccent: paper,
    selectionBackground: token('--red-wash'),
    selectionForeground: ink,
    black: ink,
    brightBlack: token('--ink-2'),
    red: token('--red'),
    brightRed: token('--red'),
    green: token('--green'),
    brightGreen: token('--green'),
    yellow: token('--code-pre'),
    brightYellow: token('--code-pre'),
    blue: token('--blue'),
    brightBlue: token('--blue'),
    magenta: token('--taint'),
    brightMagenta: token('--taint'),
    cyan: token('--blue'),
    brightCyan: token('--blue'),
    white: paper,
    brightWhite: paper,
  }
}

/** Re-themes on the player's setting (a root attribute) or the system colour scheme. Returns the cleanup. */
export function followTheme(terminal: Pick<Terminal, 'options'>, element: HTMLElement): () => void {
  const apply = () => {
    const style = getComputedStyle(element)
    terminal.options.theme = terminalTheme((name) => style.getPropertyValue(name))
  }
  apply()
  const attributes = new MutationObserver(apply)
  attributes.observe(document.documentElement, { attributeFilter: ['data-theme', 'class'] })
  const scheme = matchMedia(DARK_SCHEME)
  scheme.addEventListener('change', apply)
  return () => {
    attributes.disconnect()
    scheme.removeEventListener('change', apply)
  }
}
