import { useCodeEditor } from '@features/editor/hooks/codemirror'
import type { ApplyState, EditorFile } from '@features/editor/types'
import { Button } from '@shared/components/ui'
import { APPLY_BINDING, ariaKeyShortcut, shortcutLabel } from '@shared/utils/keyboard'
import { useId, useRef, useState } from 'react'
import { FileTabs } from './FileTabs'
import './CodeEditor.css'

export interface CodeEditorPresentationProps {
  /** One per router, in tab order. */
  files: readonly EditorFile[]
  activePath: string
  /** Paths whose content differs from what the mission started with (shown with a mark on the tab). */
  modified: ReadonlySet<string>
  apply: ApplyState
  /** A short line: what the last Apply did, or where the Machine is while it starts; null when there is nothing to say. */
  status: string | null
  onSelectFile: (path: string) => void
  onChange: (path: string, content: string) => void
  /** The Apply button and Mod+Enter: load what is written into the running routers. */
  onApply: () => void
  /** After the player confirms: every configuration back to what the mission started with. */
  onReset: () => void
  /** Laid over the editor while there is nothing to edit, e.g. "Select a router on the map."; null or left out otherwise. */
  notice?: string | null
  /** What the router answered to the lines it refused, in FRR's own words; empty or left out when it took them all. */
  errors?: readonly string[]
}

const APPLY_SHORTCUT = shortcutLabel(APPLY_BINDING)

/** An FRR configuration per router, in CodeMirror. Nothing reaches a router until Apply. */
export function CodeEditorPresentation(props: CodeEditorPresentationProps) {
  const { files, activePath, apply, status, notice = null, errors = [] } = props
  const surface = useRef<HTMLDivElement>(null)
  const applyReasonId = useId()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const file = files.find((candidate) => candidate.path === activePath) ?? files[0]
  const { loaded, failed } = useCodeEditor(surface, {
    file,
    handlers: { onChange: props.onChange, onApply: props.onApply },
  })
  const busy = apply.kind === 'busy'
  const working = busy && apply.working === true

  const reset = () => {
    setConfirmingReset(false)
    props.onReset()
  }

  return (
    <section aria-label="Configuration editor" className="config-editor">
      <div className="config-editor__bar">
        <FileTabs
          files={files}
          activePath={file?.path ?? activePath}
          modified={props.modified}
          onSelect={props.onSelectFile}
        />
        <div className="config-editor__actions">
          {/* Cut short when the bar is tight; the tooltip keeps the whole note. */}
          <span role="status" aria-live="polite" className="config-editor__status" title={status ?? undefined}>
            {status}
          </span>
          {confirmingReset ? (
            <>
              <span className="config-editor__ask">Reset every router?</span>
              <Button onClick={reset}>Reset</Button>
              <Button variant="quiet" onClick={() => setConfirmingReset(false)}>
                Keep mine
              </Button>
            </>
          ) : (
            <Button variant="quiet" onClick={() => setConfirmingReset(true)}>
              Reset
            </Button>
          )}
          {/* aria-disabled, not disabled: the button stays focusable, so its reason can be read. */}
          <Button
            variant="primary"
            className={working ? 'config-editor__apply--working' : undefined}
            aria-keyshortcuts={ariaKeyShortcut(APPLY_BINDING)}
            aria-disabled={busy || undefined}
            aria-busy={working || undefined}
            aria-describedby={busy ? applyReasonId : undefined}
            title={busy ? apply.reason : undefined}
            onClick={busy ? undefined : props.onApply}
          >
            {busy ? apply.label : 'Apply'}
            <kbd>{APPLY_SHORTCUT}</kbd>
          </Button>
          {busy && (
            <span id={applyReasonId} className="pf-visually-hidden">
              {apply.reason}
            </span>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <div className="config-editor__errors" role="alert">
          <p>The router refused part of this configuration. What it accepted stays applied.</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div ref={surface} className="config-editor__surface">
        {!loaded && (
          <p className="config-editor__loading">
            {failed ? "The editor didn't load. Check your connection and reload the page." : 'Loading the editor…'}
          </p>
        )}
        {loaded && notice !== null && <p className="config-editor__notice">{notice}</p>}
      </div>
    </section>
  )
}
