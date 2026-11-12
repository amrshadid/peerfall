import { useHeaderWidth } from '@features/mission/hooks/layout'
import type { MissionLayoutModel } from '@features/mission/types'
import {
  hasNetworkDock,
  MISSION_PANEL_IDS as IDS,
  SPLIT_STEP_PERCENT,
  sizeVariables,
  WIDTH_STEP_REM,
} from '@features/mission/utils/layout'
import { ScreenFrame, Splitter, StatusBar } from '@shared/components/layout'
import { Dialog } from '@shared/components/modals'
import { Button, TitleBlock } from '@shared/components/ui'
import { limitsAtLeast } from '@shared/utils/layout'
import { PANEL_LIMITS } from '@shared/utils/settings'
import type { CSSProperties } from 'react'
import { MissionTopBar } from './MissionTopBar'
import './MissionLayout.css'

export type MissionLayoutProps = MissionLayoutModel

const PERCENT = 100

const remPx = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
const widthOf = (id: string) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) / remPx()
const heightOf = (id: string) => document.getElementById(id)?.getBoundingClientRect().height ?? 0
const editorShare = () => (heightOf(IDS.editor) / Math.max(1, heightOf(IDS.workspace))) * PERCENT
const percentPx = () => heightOf(IDS.workspace) / PERCENT

/**
 * The mission's sheet: the Guide on the left, the editor over the terminal in the middle, the
 * network (topology over timeline) on the right. A panel the mission hasn't opened is not drawn.
 */
export function MissionLayout({
  chrome,
  page,
  volume,
  bar,
  panels,
  slots,
  terminalLabel,
  terminalStatus,
  titleBlock,
  debrief,
  restart,
  status,
  panelSizes,
}: MissionLayoutProps) {
  const network = hasNetworkDock(panels)
  const { sizes, onResize } = panelSizes
  // Title, Restart and the mission's name sit over the Guide, so it never gets narrower than they are.
  const guideLimits = limitsAtLeast(PANEL_LIMITS.guide, useHeaderWidth('.mission-topbar__name', IDS.guide))
  const covered = debrief !== null

  return (
    <ScreenFrame
      page={page}
      volume={volume}
      chrome={chrome}
      topbar={
        <>
          <a className="mission-skip" href={`#${IDS.workspace}`}>
            Skip to the workspace
          </a>
          <MissionTopBar bar={bar} onMenu={status.onShortcuts} />
        </>
      }
      foot={
        <StatusBar
          save={status.save}
          savedAgoMs={status.savedAgoMs}
          items={[status.machine]}
          end={
            <button type="button" className="mission-status__shortcuts" onClick={status.onShortcuts}>
              Shortcuts <kbd>?</kbd>
            </button>
          }
        />
      }
    >
      <main
        className={`mission-work screen__sheet pf-sheet mission-work--${network ? 'with' : 'no'}-network`}
        style={sizeVariables(sizes, guideLimits.min) as CSSProperties}
      >
        <aside className="mission-guide" id={IDS.guide} aria-label="Guide" tabIndex={-1}>
          {slots.guide}
        </aside>
        <Splitter
          label="Resize the Guide"
          orientation="vertical"
          direction={1}
          limits={guideLimits}
          step={WIDTH_STEP_REM}
          value={sizes.guide}
          measure={() => widthOf(IDS.guide)}
          pxPerUnit={remPx}
          onResize={(size) => onResize('guide', size)}
          onReset={() => onResize('guide', null)}
        />

        <section
          id={IDS.workspace}
          className={`mission-workspace${panels.editor ? '' : ' mission-workspace--terminal-only'}`}
          aria-label="Workspace"
          tabIndex={-1}
          inert={covered}
        >
          {panels.editor && (
            <div className="mission-workspace__editor" id={IDS.editor} tabIndex={-1}>
              {slots.editor}
            </div>
          )}
          {panels.editor && (
            <Splitter
              label="Resize the editor and the terminal"
              orientation="horizontal"
              direction={1}
              limits={PANEL_LIMITS.editor}
              step={SPLIT_STEP_PERCENT}
              value={sizes.editor}
              measure={editorShare}
              pxPerUnit={percentPx}
              onResize={(size) => onResize('editor', size)}
              onReset={() => onResize('editor', null)}
            />
          )}
          <section className="mission-terminal" id={IDS.terminal} aria-label="Terminal" tabIndex={-1}>
            <div className="mission-terminal__head">
              Terminal
              <span role="status" aria-live="polite">
                {terminalStatus ?? terminalLabel}
              </span>
            </div>
            <div className="mission-terminal__slot">{slots.terminal}</div>
          </section>
        </section>

        {network && (
          <Splitter
            inert={covered}
            label="Resize the network"
            orientation="vertical"
            direction={-1}
            limits={PANEL_LIMITS.network}
            step={WIDTH_STEP_REM}
            value={sizes.network}
            measure={() => widthOf(IDS.network)}
            pxPerUnit={remPx}
            onResize={(size) => onResize('network', size)}
            onReset={() => onResize('network', null)}
          />
        )}
        {/* A plain dock, not a landmark: the topology and the timeline name their own regions. */}
        {network && (
          <div className="mission-network" id={IDS.network} tabIndex={-1} inert={covered}>
            {panels.topology && (
              <div className="mission-network__topology" id={IDS.topology}>
                {slots.topology}
              </div>
            )}
            {panels.timeline && (
              <div className="mission-network__timeline" id={IDS.timeline}>
                {slots.timeline}
              </div>
            )}
            <TitleBlock entries={titleBlock} />
          </div>
        )}

        {/* The debrief takes the workspace and the network together, so it reads whole on a narrow screen. */}
        {debrief !== null && <div className="mission-debrief">{debrief}</div>}
      </main>

      <Dialog
        open={restart.open}
        onClose={restart.onCancel}
        title="Start this mission again?"
        actions={
          <>
            <Button variant="quiet" onClick={restart.onCancel}>
              Keep going
            </Button>
            <Button variant="primary" onClick={restart.onConfirm}>
              Start again
            </Button>
          </>
        }
      >
        <p>
          The network goes back to how the mission found it: healthy, with its first configuration. The steps you did
          and the hints you asked for are dropped. Retrying is free, and nothing is timed.
        </p>
      </Dialog>
    </ScreenFrame>
  )
}
