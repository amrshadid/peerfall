// @vitest-environment jsdom
import { timelineRunOf } from '@features/timeline/utils/runs'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BASELINE_EVENTS, ONGOING_EVENTS, REPAIRED_EVENTS } from '@/test/fixtures/machine-events.fixture'
import { TimelinePresentation } from './TimelinePresentation'

afterEach(cleanup)

const baseline = timelineRunOf('Baseline', BASELINE_EVENTS)
const repaired = timelineRunOf('Repaired', REPAIRED_EVENTS)

const rowsOf = (caption: RegExp) =>
  within(screen.getByRole('table', { name: caption }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent)

describe('TimelinePresentation', () => {
  it('states the length of each outage in seconds, in text', () => {
    render(<TimelinePresentation baseline={baseline} repaired={repaired} targetSeconds={2} />)
    expect(
      screen.getByRole('table', { name: 'Baseline: traffic was lost for 37.8 s, over the 2.00 s target.' })
    ).toBeTruthy()
    expect(
      screen.getByRole('table', { name: 'Repaired: traffic was lost for 0.90 s, inside the 2.00 s target.' })
    ).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Repaired recovered 36.9 s sooner than baseline.')
  })

  it('lists every moment of a run with its time in seconds after the fault', () => {
    render(<TimelinePresentation baseline={baseline} repaired={repaired} />)
    expect(rowsOf(/^Repaired/)).toEqual([
      'FFaultThe link starts dropping every packetlink a–c; its interfaces stay up0.00 s',
      'DDetectionBFD session downa: peer 10.0.2.2 on a-c, control-expired+0.81 s',
      'AAdjacency changeOSPF adjacency Full → Deleteda: neighbor 10.255.0.3 on a-c (InactivityTimer)+0.81 s',
      'RRoute updateNew route installeda: 10.255.0.3 via 10.0.1.2 on a-b+0.88 s',
      'PFirst good probeFirst probe answered againa-to-c #11, 0.7 ms+0.90 s',
    ])
    expect(rowsOf(/^Baseline/)[1]).toContain('OSPF dead timer expired')
    expect(rowsOf(/^Baseline/)[1]).toContain('+37.6 s')
  })

  it('draws both runs on one axis and gives the picture the same words', () => {
    render(<TimelinePresentation baseline={baseline} repaired={repaired} />)
    const chart = screen.getByRole('img')
    expect(chart.getAttribute('aria-label')).toBe(
      'Baseline: traffic was lost for 37.8 s. Repaired: traffic was lost for 0.90 s. Repaired recovered 36.9 s sooner than baseline.'
    )
    expect([...chart.querySelectorAll('.timeline__tick')].map((tick) => tick.textContent)).toEqual([
      '0',
      '10',
      '20',
      '30',
      '40',
    ])
    // The baseline's outage fills most of the shared axis; the repaired run's a sliver of it.
    const [long, short] = [...chart.querySelectorAll<HTMLElement>('.timeline__outage')].map((bar) => bar.style.width)
    expect(long).toBe('94.5%')
    expect(short).toBe('2.25%')
  })

  it('shows the baseline alone, with the repaired lane waiting and the target named', () => {
    render(<TimelinePresentation baseline={baseline} repaired={null} targetSeconds={2} />)
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByText('not recorded yet')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Target: traffic back in under 2.00 s.')
  })

  it('says so while a run is still losing traffic', () => {
    render(<TimelinePresentation baseline={timelineRunOf('Baseline', ONGOING_EVENTS)} repaired={null} />)
    expect(screen.getByRole('table', { name: 'Baseline: traffic is still being lost.' })).toBeTruthy()
  })

  it('explains what a run is before any was recorded', () => {
    render(<TimelinePresentation baseline={null} repaired={null} />)
    expect(screen.getByText(/No run recorded yet\. A run starts when/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('No run recorded yet.')
  })
})
