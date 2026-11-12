import { APP_NAME } from '@shared/constants/app'
import { useEffect, useId, useRef, useState } from 'react'
import './Wordmark.css'

export interface WordmarkProps {
  title?: string
}

const HEIGHT = 196
const GRADE_Y = 112
const BASELINE_Y = 170
const FONT_SIZE = 212
// The set word is about this wide in Archivo at wdth 125; replaced by the real width once fonts load.
const ESTIMATED_WIDTH = 1010

/** Solid ink above a red chain line, hatched below: the name cut in section, like every drawing in the manual. */
export function Wordmark({
  title = `${APP_NAME} wordmark, cut by a red section line: solid above, hatched below`,
}: WordmarkProps) {
  const id = useId()
  const textRef = useRef<SVGTextElement>(null)
  const [box, setBox] = useState({ x: 0, width: ESTIMATED_WIDTH })

  useEffect(() => {
    let cancelled = false
    // Fit the viewBox to the set word once the face has loaded, so it never clips.
    document.fonts?.ready.then(() => {
      const measured = textRef.current?.getBBox?.()
      if (!cancelled && measured && measured.width > 0) {
        setBox({ x: measured.x, width: measured.width })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const hatch = `${id}-hatch`
  const above = `${id}-above`
  const below = `${id}-below`
  const clipWidth = box.width + 40

  return (
    <svg
      className="pf-wordmark"
      viewBox={`${box.x - 2} 0 ${box.width + 6} ${HEIGHT}`}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-labelledby={`${id}-title`}
    >
      <title id={`${id}-title`}>{title}</title>
      <defs>
        <pattern id={hatch} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="var(--sheet)" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="var(--ink)" strokeWidth="2.4" />
        </pattern>
        <clipPath id={above}>
          <rect x={box.x - 20} y="0" width={clipWidth} height={GRADE_Y} />
        </clipPath>
        <clipPath id={below}>
          <rect x={box.x - 20} y={GRADE_Y} width={clipWidth} height={HEIGHT - GRADE_Y} />
        </clipPath>
      </defs>
      <text
        ref={textRef}
        className="pf-wordmark__text"
        x="0"
        y={BASELINE_Y}
        fontSize={FONT_SIZE}
        fill="var(--ink)"
        clipPath={`url(#${above})`}
      >
        {APP_NAME}
      </text>
      <text
        className="pf-wordmark__text"
        x="0"
        y={BASELINE_Y}
        fontSize={FONT_SIZE}
        fill={`url(#${hatch})`}
        stroke="var(--ink)"
        strokeWidth="3"
        clipPath={`url(#${below})`}
      >
        {APP_NAME}
      </text>
      <line
        x1={box.x - 2}
        y1={GRADE_Y}
        x2={box.x + box.width + 4}
        y2={GRADE_Y}
        stroke="var(--red)"
        strokeWidth="4"
        strokeDasharray="44 8 6 8"
      />
    </svg>
  )
}
