import type { KeyBinding, Shortcut } from '@shared/types'

/** The editor's own key (CodeMirror handles it), shared with its button label. */
export const APPLY_BINDING: KeyBinding = { code: 'Enter', mod: true }

/** Terminal rows have no id: they belong to the shell, listed so players know the game never takes them. */
export const SHORTCUTS: readonly Shortcut[] = [
  // The editor handles this itself, so it has no id here: listed so players find it.
  { id: null, group: 'Game', action: 'Apply the configuration (in the editor)', binding: APPLY_BINDING },
  { id: 'next-step', group: 'Game', action: 'Next step', binding: { code: 'KeyN', alt: true } },
  {
    id: 'previous-step',
    group: 'Game',
    action: 'Look at the previous step',
    binding: { code: 'KeyP', alt: true },
  },
  { id: 'hint', group: 'Game', action: 'Hint', binding: { code: 'KeyH', alt: true } },
  { id: 'focus-guide', group: 'Game', action: 'Focus Guide', binding: { code: 'KeyG', alt: true } },
  { id: 'focus-editor', group: 'Game', action: 'Focus editor', binding: { code: 'KeyE', alt: true } },
  { id: 'focus-terminal', group: 'Game', action: 'Focus terminal', binding: { code: 'KeyT', alt: true } },
  { id: 'focus-network', group: 'Game', action: 'Focus the network', binding: { code: 'KeyW', alt: true } },
  {
    id: 'cheat-sheet',
    group: 'Game',
    action: 'Shortcut cheat sheet (or ? outside text)',
    // Not Cmd+Shift+/: that is ⌘?, which macOS gives to the browser's Help menu, so the page never sees it.
    binding: { code: 'Slash', alt: true },
  },
  {
    id: null,
    group: 'Terminal',
    action: 'Interrupt the command (SIGINT)',
    binding: { code: 'KeyC', mod: false },
  },
  { id: null, group: 'Terminal', action: 'Leave the mode, or end of input', binding: { code: 'KeyD' } },
  { id: null, group: 'Terminal', action: 'Back to enable mode (in vtysh)', binding: { code: 'KeyZ' } },
  { id: null, group: 'Terminal', action: 'Clear the screen', binding: { code: 'KeyL' } },
  { id: null, group: 'Terminal', action: 'Previous command', binding: { code: 'ArrowUp' } },
]

/** Terminal rows are pressed with Ctrl on every system, as in a real terminal. */
export const TERMINAL_MODIFIER = 'Ctrl'
