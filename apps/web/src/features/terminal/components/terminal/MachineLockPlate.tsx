import type { MachineLock } from '@shared/types'
import './MachineLockPlate.css'

export interface MachineLockPlateProps {
  lock: MachineLock
}

const STEPS = ['Load', 'Boot', 'Network'] as const

// Where the start-up is, as an index into STEPS. A restore skips the boot, so it stands on the network.
const CURRENT_STEP: Readonly<Record<MachineLock['phase'], number>> = {
  off: 0,
  loading: 0,
  booting: 1,
  restoring: 2,
  'setting-up': 2,
  settling: 2,
  failed: 0,
}

/** A notice plate over the console: the boot log stays readable through it, keys don't pass. */
export function MachineLockPlate({ lock }: MachineLockPlateProps) {
  const current = CURRENT_STEP[lock.phase]
  return (
    <div className="pf-machine-lock">
      <div
        className={`pf-machine-lock__plate${lock.failed ? ' pf-machine-lock__plate--failed' : ''}`}
        role={lock.failed ? 'alert' : 'status'}
      >
        <p className="pf-machine-lock__label">
          {lock.failed ? 'Fault: the terminal is closed' : 'Stand by: the terminal opens when the network is up'}
        </p>
        <p className="pf-machine-lock__title">{lock.title}</p>
        {lock.detail !== null && <p className="pf-machine-lock__detail">{lock.detail}</p>}
        {!lock.failed && (
          <ol className="pf-machine-lock__steps" aria-label={`Step ${current + 1} of ${STEPS.length}`}>
            {STEPS.map((step, index) => (
              <li
                key={step}
                className={index < current ? 'is-done' : index === current ? 'is-current' : undefined}
                aria-current={index === current ? 'step' : undefined}
              >
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
