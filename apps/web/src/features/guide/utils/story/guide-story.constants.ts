import type { GuideStepId, SpeakerInfo } from '@features/guide/types'

/** The five steps of a mission's story, in order, as the step rail shows them. */
export const GUIDE_STEPS: readonly { readonly id: GuideStepId; readonly label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'see', label: 'See it' },
  { id: 'build', label: 'Build it' },
  { id: 'watch', label: 'Watch it' },
  { id: 'debrief', label: 'Debrief' },
]

/**
 * The story sections the Guide shows for a step, in order of preference: a step without its own
 * falls back to the one before. The debrief ends with the real world, under its own heading.
 */
export const SECTION_FOR_STEP: Readonly<Record<GuideStepId, readonly string[]>> = {
  scene: ['scene'],
  see: ['see-it', 'scene'],
  build: ['build-it', 'see-it'],
  watch: ['watch-it', 'debrief'],
  debrief: ['debrief', 'watch-it'],
}

/** The section that closes the story, read after the debrief. */
export const REAL_WORLD_SECTION = 'real-world'
export const REAL_WORLD_HEADING = 'In the real world'

/** By the name the story gives them. Each is a real part of FRR and speaks as what it does. */
export const SPEAKERS: Readonly<Record<string, SpeakerInfo>> = {
  zebra: { id: 'zebra', name: 'zebra', term: "FRR's core daemon, keeper of the routes", portrait: 'zebra' },
  watchfrr: {
    id: 'watchfrr',
    name: 'watchfrr',
    term: "FRR's watchdog, which starts the daemons",
    portrait: 'watchfrr',
  },
  mgmtd: { id: 'mgmtd', name: 'mgmtd', term: "FRR's configuration daemon", portrait: null },
  staticd: { id: 'staticd', name: 'staticd', term: "FRR's static route daemon", portrait: null },
  ospfd: { id: 'ospfd', name: 'ospfd', term: "FRR's OSPF daemon", portrait: null },
  isisd: { id: 'isisd', name: 'isisd', term: "FRR's IS-IS daemon", portrait: null },
  bfdd: { id: 'bfdd', name: 'bfdd', term: "FRR's BFD daemon", portrait: 'bfdd' },
  bgpd: { id: 'bgpd', name: 'bgpd', term: "FRR's BGP daemon", portrait: null },
}

/** A line the story gives no speaker. */
export const NARRATOR: SpeakerInfo = { id: 'narrator', name: '', term: '', portrait: null }

/** How the Guide names each hint, in Kernelfall's order: "Hint 1, a nudge". */
export const HINT_TIER_NAMES: readonly string[] = ['a nudge', 'the concept', 'the spot']

/** The Guide's note while building. */
export const BUILD_NOTE = 'Objectives tick on their own as the routers change; there is no Submit button.'
