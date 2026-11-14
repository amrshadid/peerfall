import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { EDGE, layoutMap, NODE_SIZE, overviewDescription, overviewWindow } from '@features/map/utils/layout'
import { hereFlag } from '@features/map/utils/marks'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapDrawing } from './MapDrawing'

const today = () => journeyChapters(journeyFixture(), FIRST_MISSION)
const longer = () => journeyChapters(longerJourneyFixture(false), FIRST_MISSION)

function render(chapters = today(), selectedKey: string | null = null) {
  const scene = layoutMap(chapters, 774)
  const noop = () => undefined
  const html = renderToStaticMarkup(
    <MapDrawing
      variant="map"
      scene={scene}
      selectedKey={selectedKey}
      pulse={false}
      onSelect={noop}
      onPlay={noop}
      onFocusStop={noop}
      onPoint={noop}
      onFocusNote={noop}
    />
  )
  return { scene, html }
}

const buttons = (html: string) => [...html.matchAll(/<g role="button" tabindex="(-?\d)" aria-label="([^"]+)"/g)]

describe('MapDrawing', () => {
  it('makes every stop a button with an accessible name that says its status, in play order', () => {
    const { scene, html } = render(longer())
    const found = buttons(html)
    expect(found).toHaveLength(scene.stops.length)
    expect(found.map((match) => match[2])).toEqual([
      'Missions to come in stage 1, not built yet',
      'Missions to come in stage 2, not built yet',
      'Missions to come in stage 3, not built yet',
      '4.1 The Link That Never Went Down, in progress, you are here',
      '4.2 A Restart Nobody Noticed, locked',
      'Missions to come in stage 5, not built yet',
      'Missions to come in stage 6, not built yet',
      'Missions to come in stage 7, not built yet',
      'Missions to come in stage 8, not built yet',
      'Missions to come in stage 9, not built yet',
      'Missions to come in stage 10, not built yet',
      'Missions to come in stage 11, not built yet',
    ])
  })

  it('describes every stop to screen readers by its objective', () => {
    const { scene, html } = render(longer())
    const described = [
      ...html.matchAll(/<g role="button"[^>]*aria-describedby="([^"]+)"[^>]*><desc id="([^"]+)">([^<]*)<\/desc>/g),
    ]
    expect(described).toHaveLength(scene.stops.length)
    expect(described.every(([, ref, id]) => ref === id)).toBe(true)
    expect(described.map((match) => match[3])).toEqual(scene.stops.map((stop) => stop.stop.summary))
  })

  it('has one tab stop: "you are here" until something is selected', () => {
    const fresh = buttons(render(longer()).html).filter((match) => match[1] === '0')
    expect(fresh).toHaveLength(1)
    expect(fresh[0]?.[2]).toMatch(/^4\.1 .*you are here$/)

    const selected = buttons(render(longer(), SECOND_MISSION.id).html).filter((match) => match[1] === '0')
    expect(selected.map((match) => match[2])).toEqual(['4.2 A Restart Nobody Noticed, locked'])
  })

  it('groups the drawing by stage, all eleven named in play order', () => {
    const groups = [...render().html.matchAll(/<g role="group" aria-label="([^"]+)"/g)].map((match) => match[1])
    expect(groups).toHaveLength(11)
    expect(groups[0]).toBe('Stage 1: First router')
    expect(groups[3]).toBe('Stage 4: Recover from failure')
    expect(groups[10]).toBe('Stage 11: Operate a network')
  })

  it('draws a stage with no missions as a pencilled stop on a hatched band, and says it is planned in words', () => {
    const { html } = render()
    expect(html.match(/>Missions to come<\/text>/g)).toHaveLength(10)
    expect(html.match(/ · planned<\/text>/g)).toHaveLength(10)
    expect(html.match(/class="pf-node__planned"/g)).toHaveLength(10)
    expect(html.match(/map-fig__band--planned/g)).toHaveLength(10)
    expect(html.match(/class="map-fig__tone-planned"/g)).toHaveLength(10)
  })

  it("prints the FRR parts of every stage in mono, and each region's place in FRR's source", () => {
    const { html } = render()
    // Eleven stages, and stage 4's one region.
    expect(html.match(/class="map-fig__mono"/g)).toHaveLength(12)
    expect(html).toContain('>FRR parts: zebra, staticd</text>')
    expect(html).toContain('>bfdd/, ospfd/ospf_bfd.c, ospfd/ospf_nsm.c</text>')
    expect(html).toContain('>Notice it fast</text>')
  })

  it('draws the road in two strokes from one start mark: travelled up to "you", dashed ahead', () => {
    const { scene, html } = render()
    expect(html).toContain(`<path d="${scene.road.reached}" class="pf-road"`)
    expect(html).toContain(`<path d="${scene.road.ahead}" class="pf-road pf-road--ahead"`)
    expect(html.match(/class="map-fig__start"/g)).toHaveLength(1)
    expect(html).toContain(`<circle cx="${scene.start?.x}" cy="${scene.start?.y}" r="6" class="map-fig__start"`)
  })

  it('draws each done state in its own shape', () => {
    const marks = (attempts: number, hints: number) =>
      render(journeyChapters(journeyFixture('completed', attempts, hints), null)).html
    expect(marks(1, 0)).toContain('class="pf-node__clean"')
    expect(marks(3, 0)).not.toContain('class="pf-node__clean"')
    expect(marks(3, 0)).toContain('class="pf-node__solid"')
    expect(marks(1, 2)).toMatch(/class="pf-node__open"><\/rect><rect x="-7" y="-7" width="14" height="14"/)
  })

  it('flags "You are here" once, from the flag model, and not at all with nowhere to stand', () => {
    const { scene, html } = render()
    expect(html.match(/You are here/g)).toHaveLength(1)
    if (!scene.here) {
      throw new Error('a fresh save has somewhere to stand')
    }
    const flag = hereFlag(scene.here, NODE_SIZE, { left: EDGE, right: scene.width - EDGE, top: 0 })
    expect(html).toContain(`<path d="${flag.pin}" class="pf-flag__red"`)
    expect(html).toContain(`<rect x="${flag.box.x}" y="${flag.box.y}" width="96" height="22" class="pf-flag__red"`)
    expect(render(journeyChapters(journeyFixture('completed'), null)).html).not.toContain('You are here')
  })

  it('draws the operated network the road leads to, its routers on one backbone', () => {
    const { html } = render()
    expect(html).toContain('>An operated network</text>')
    expect(html.match(/class="map-fig__router"/g)).toHaveLength(5)
    expect(html).toContain('class="map-fig__bus"')
  })

  it('never calls the network anything but real', () => {
    expect(render().html.toLowerCase()).not.toMatch(/simulat|emulat|fake/)
  })
})

describe('MapDrawing overview', () => {
  function overview(chapters = today()) {
    const scene = layoutMap(chapters, 460, 'overview')
    const shown = overviewWindow(scene, 400)
    const description = overviewDescription(chapters)
    const html = renderToStaticMarkup(
      <MapDrawing variant="overview" scene={scene} shown={shown} description={description} pulse={false} />
    )
    return { scene, shown, description, html, map: render(chapters).html }
  }

  const marks = (html: string) => html.match(/<g transform="translate\(/g)?.length

  it('is one read-only image, described in words and cropped to the window around "you"', () => {
    const { scene, shown, description, html } = overview()
    expect(html).toMatch(
      new RegExp(
        `^<svg class="map-fig map-fig--overview" width="460" height="${shown.height}" viewBox="0 ${shown.top} 460 ${shown.height}" role="img"`
      )
    )
    expect(html).toContain(`>${description}</title>`)
    expect(html).not.toContain('role="button"')
    expect(html).not.toContain('tabindex')
    expect(html.match(/You are here/g)).toHaveLength(1)
    expect(scene.here?.key).toBe(FIRST_MISSION.id)
  })

  it("draws every stop, the road and the flag with the map's own marks", () => {
    const { html, map } = overview(longer())
    expect(marks(html)).toBe(marks(map))
    for (const mark of ['class="pf-road"', 'class="pf-road pf-road--ahead"', 'pf-flag__red', 'map-fig__router']) {
      expect(html).toContain(mark)
    }
  })
})
