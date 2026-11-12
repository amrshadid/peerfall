// No container yet: the one that joins this terminal to the Machine takes these.
export {
  TerminalPresentation,
  type TerminalPresentationProps,
} from '@features/terminal/components/terminal'
export { type TerminalView, type TerminalViewOptions, useTerminalView } from '@features/terminal/hooks/view'
export { vmStatusLine } from '@features/terminal/utils/vm'
