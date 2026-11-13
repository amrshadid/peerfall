import type { TourStop } from '@features/tour/types'
import type { TourScreen } from '@shared/types'
import { APPLY_BINDING, shortcutLabel } from '@shared/utils/keyboard'

/** The longest a stop's text may be: one short sentence or two, read in a glance. */
export const MAX_STOP_TEXT_LENGTH = 140

/**
 * The guided tours, one short sentence per stop. A stop whose panel the mission
 * hasn't opened yet is skipped, and it plays the first time that panel appears.
 */
export const TOUR_STOPS: Readonly<Record<TourScreen, readonly TourStop[]>> = {
  title: [
    {
      id: 'title:start',
      // The button itself, not its wrapper with the lines under it.
      selector: '.title__continue [data-primary]',
      title: 'Start here',
      text: 'This button always takes you to the next thing to do, and the game saves itself as you play.',
      side: 'right',
    },
    {
      id: 'title:contents',
      selector: '.title__menu',
      title: 'Table of contents',
      text: 'The Peer Map picks missions across the eleven stages, and Settings holds the theme and your saves.',
      side: 'right',
    },
    {
      id: 'title:drawing',
      selector: '.title__drawing',
      title: 'Fig. 1, the Peer Map around you',
      text: "The red flag is where you stand; the road below is what's next. Select it to open the whole map.",
      side: 'left',
    },
  ],
  map: [
    {
      id: 'map:drawing',
      selector: '.map-scroll',
      title: 'The Peer Map',
      text: 'Eleven stages from one router down to an operated network. Each square on the road is a mission.',
      side: 'left',
    },
    {
      id: 'map:gauge',
      selector: '.map-gauge',
      title: 'The stage gauge',
      text: 'Every stage with how many missions you passed. Select one to go there, or Find me to come back.',
      side: 'right',
    },
    {
      id: 'map:detail',
      selector: '.map-detail__head',
      title: 'The selected mission',
      text: 'Select a mission to see what it asks, what it needs first, and to play it.',
      side: 'left',
    },
    {
      id: 'map:legend',
      selector: '.map-detail__legend',
      title: 'The legend',
      text: 'A mission is told by its shape: planned, locked, available, in progress or completed.',
      side: 'left',
    },
    {
      id: 'map:next',
      selector: '.map-topbar__next',
      title: 'Recommended next',
      text: 'Continue always goes to the next mission to play.',
      side: 'bottom',
    },
  ],
  mission: [
    {
      id: 'mission:guide',
      selector: '#mission-guide',
      title: 'The Guide',
      text: 'The story, a step at a time: it goes on when you finish a command or press Continue. Objectives tick by themselves.',
      side: 'right',
    },
    {
      id: 'mission:steps',
      selector: '.pf-rail',
      title: 'Five steps',
      text: 'Scene, See it, Build it, Watch it, Debrief. Finished steps stay clickable so you can look again.',
      side: 'bottom',
    },
    {
      id: 'mission:terminal',
      selector: '#mission-terminal',
      title: 'The terminal',
      text: 'A shell on the selected router, on real Linux. Type vtysh for the same console a real FRR router gives you.',
      // Over the editor's right side; the prompt starts at the left.
      side: 'top',
      align: 'end',
    },
    {
      id: 'mission:editor',
      selector: '#mission-editor',
      title: 'The configuration',
      text: `Each router's FRR configuration. Apply (${shortcutLabel(APPLY_BINDING)}) loads what you wrote into the running router.`,
      // Over the terminal's right side, clear of its prompt.
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'mission:topology',
      selector: '#mission-topology',
      title: 'The topology',
      text: 'Select a router to move the terminal there. The bold line is the path traffic takes right now.',
      side: 'left',
    },
    {
      id: 'mission:timeline',
      selector: '#mission-timeline',
      title: 'The timeline',
      text: "The outage in seconds, read from FRR's own logs: the fault, its detection, the new route, the first good probe.",
      side: 'left',
    },
    {
      id: 'mission:hint',
      selector: '.pf-hint',
      title: 'Hints',
      text: 'Staged: where to look first, a specific command last. Nothing is timed, and you can retry as often as you like.',
      side: 'bottom',
    },
    {
      id: 'mission:status',
      selector: '.pf-status-bar',
      title: 'Status bar',
      text: 'Whether Linux and the routers are running. Press ? any time for every shortcut.',
      // Mid-screen, clear of the Guide's way-on button in the lower left.
      side: 'top',
      align: 'center',
    },
  ],
}
