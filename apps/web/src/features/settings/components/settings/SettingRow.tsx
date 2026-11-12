import type { ReactNode } from 'react'

export interface SettingRowProps {
  label: string
  description: ReactNode
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function SettingRow({ label, description, children, tone = 'default' }: SettingRowProps) {
  return (
    <div className={`settings-row${tone === 'danger' ? ' settings-row--danger' : ''}`}>
      <div className="settings-row__text">
        <h3 className="settings-row__label">{label}</h3>
        <p className="settings-row__description">{description}</p>
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  )
}
