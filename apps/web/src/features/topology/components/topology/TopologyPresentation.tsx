import { useRouterFocus } from '@features/topology/hooks/focus'
import type { TopologyPresentationProps } from '@features/topology/types'
import { DEFAULT_PATH_LABEL, topologyViewOf } from '@features/topology/utils/layout'
import { useMemo } from 'react'
import { TopologyDrawing } from './TopologyDrawing'
import { TopologyLinkLabels } from './TopologyLinkLabels'
import './Topology.css'

const percent = (value: number) => `${value}%`

/** The network as a drawing: routers are buttons, and every link says what it is doing in words. */
export function TopologyPresentation({
  network,
  linkStates,
  activePath,
  pathLabel = DEFAULT_PATH_LABEL,
  otherPaths,
  adjacencies,
  legend = null,
  selectedRouter,
  onSelectRouter,
}: TopologyPresentationProps) {
  const view = useMemo(
    () => topologyViewOf(network, linkStates, activePath, { otherPaths, adjacencies }),
    [network, linkStates, activePath, otherPaths, adjacencies]
  )
  const names = useMemo(() => view.routers.map((router) => router.name), [view.routers])
  const focus = useRouterFocus(names)

  return (
    <section className="topology" aria-label="Topology">
      <div className="topology__stage">
        <TopologyDrawing links={view.links} />
        <TopologyLinkLabels links={view.links} />

        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset can't be laid over the drawing; the group names the buttons */}
        <div className="topology__routers" role="group" aria-label="Routers" onKeyDown={focus.onKeyDown}>
          {view.routers.map((router) => {
            const selected = router.name === selectedRouter
            return (
              <button
                key={router.name}
                ref={focus.register(router.name)}
                type="button"
                className={`topology__router${selected ? ' topology__router--selected' : ''}${router.onPath ? ' topology__router--on-path' : ''}`}
                style={{ left: percent(router.at.x), top: percent(router.at.y) }}
                aria-pressed={selected}
                aria-label={`Router ${router.name}${router.loopback ? `, ${router.loopback}` : ''}${selected ? ', the terminal is here' : ''}`}
                onClick={() => onSelectRouter(router.name)}
              >
                <span className="topology__router-name">{router.name}</span>
                {router.loopback && <span className="topology__router-address">{router.loopback}</span>}
                {selected && <span className="topology__router-here">terminal</span>}
              </button>
            )
          })}
        </div>
      </div>

      <p className="topology__path" role="status">
        {view.pathText ? (
          <>
            <span className="topology__path-swatch" aria-hidden="true" />
            <span className="topology__path-label">{pathLabel}</span> <b>{view.pathText}</b>
            {view.shared && <span className="topology__path-label">(traffic is shared over these)</span>}
          </>
        ) : (
          <span className="topology__path-label">{pathLabel}: no path</span>
        )}
      </p>
      {legend !== null && <p className="topology__legend">{legend}</p>}
    </section>
  )
}
