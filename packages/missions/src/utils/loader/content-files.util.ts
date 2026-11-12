import type { ContentFiles } from '#types/definitions/content'

const CONTENT_DIR = '/content/'

// Vite inlines every content file at build time, so the game needs no server and works offline.
// Globs are written relative to this file: import.meta.glob takes paths, not the package's `#`
// imports, and Vite needs each glob's options written out as a literal. solution.yaml is never
// globbed, so the reference stays out of the bundle.
const chapterFiles = import.meta.glob<string>('../../../content/chapters.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const missionFiles = import.meta.glob<string>('../../../content/*/*/mission.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const incidentFiles = import.meta.glob<string>('../../../content/*/*/incident.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const debriefFiles = import.meta.glob<string>('../../../content/*/*/debrief.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** `…/content/4-recover-from-failure/…/mission.yaml` → `4-recover-from-failure/…/mission.yaml`, whatever form the bundler gives the path. */
export function relativeToContent<T>(files: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(files).map(([path, value]) => {
      const at = path.indexOf(CONTENT_DIR)
      return [at === -1 ? path : path.slice(at + CONTENT_DIR.length), value]
    })
  )
}

/** Every content file in the repository, keyed by its path in content/. */
export const CONTENT_FILES: ContentFiles = {
  // Empty if it's missing, so the loader reports it.
  chapters: Object.values(chapterFiles)[0] ?? '',
  missions: relativeToContent(missionFiles),
  incidents: relativeToContent(incidentFiles),
  debriefs: relativeToContent(debriefFiles),
}
