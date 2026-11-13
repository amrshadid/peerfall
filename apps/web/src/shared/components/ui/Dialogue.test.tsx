// @vitest-environment jsdom
import type { Speaker } from '@shared/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Dialogue } from './Dialogue'

afterEach(cleanup)

const ZEBRA: Speaker = { id: 'zebra', name: 'zebra', term: "FRR's core daemon", portrait: <svg />, avatar: <svg /> }
const WATCHFRR: Speaker = {
  id: 'watchfrr',
  name: 'watchfrr',
  term: "FRR's watchdog",
  portrait: <svg />,
  avatar: <svg />,
}
const NARRATOR: Speaker = { id: 'narrator', name: '', term: '', portrait: null, avatar: null }

describe('Dialogue', () => {
  it('sets narration apart as stage directions, never as a nameless speaker', () => {
    const { container } = render(
      <Dialogue
        label="Watch it"
        lines={[
          { speaker: NARRATOR, text: 'The map lights up.' },
          { speaker: ZEBRA, text: 'Who put that route in my table?' },
          { speaker: NARRATOR, text: 'Two links light up.' },
          { speaker: ZEBRA, text: 'Both of them.' },
        ]}
      />
    )
    expect(container.querySelectorAll('.pf-dialogue__narration')).toHaveLength(2)
    expect(container.querySelectorAll('.pf-dialogue__aside')).toHaveLength(0)
    expect(container.querySelectorAll('.pf-dialogue__speaker')).toHaveLength(1)
    expect(container.querySelector('.pf-dialogue__speaker b')?.textContent).toBe('zebra')
    expect(container.textContent).not.toContain('·')
  })

  it('gives the first speaker a header and lets another cut in with their real term', () => {
    const { container } = render(
      <Dialogue
        label="Scene"
        lines={[
          { speaker: ZEBRA, text: 'Nothing answers.' },
          { speaker: WATCHFRR, text: 'Nothing was started.' },
        ]}
      />
    )
    expect(container.querySelector('.pf-dialogue__speaker div span')?.textContent).toBe("FRR's core daemon")
    expect(container.querySelector('.pf-dialogue__name')?.textContent).toBe("watchfrr · FRR's watchdog")
  })

  it('leaves the header out when it goes on from a dialogue above', () => {
    const { container } = render(<Dialogue label="Scene" continued lines={[{ speaker: ZEBRA, text: 'Go on.' }]} />)
    expect(container.querySelectorAll('.pf-dialogue__speaker')).toHaveLength(0)
  })
})
