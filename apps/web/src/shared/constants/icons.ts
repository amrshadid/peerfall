/** Path data on a 24px grid, drawn for a 2px stroke to match the rule weight. */
export const ICON_PATHS = {
  back: 'M15 5 8 12l7 7',
  forward: 'm9 5 7 7-7 7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  replay: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  hint: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17l9-10',
  /** Link states: a cable that carries, one that loses packets, one that is cut. */
  'link-up': 'M3 12h18M8 7l-5 5 5 5M16 7l5 5-5 5',
  'link-dropping': 'M3 12h5M16 12h5M12 5v6M12 16h.01M4 20 20 4',
  'link-down': 'M3 12h6M15 12h6M10 8l4 8M14 8l-4 8',
} as const
