import type { EditorFile } from '@features/editor/types'
import { type TabItem, Tabs } from '@shared/components/ui'

export interface FileTabsProps {
  files: readonly EditorFile[]
  activePath: string
  /** Paths whose content differs from what the mission started with. */
  modified: ReadonlySet<string>
  onSelect: (path: string) => void
}

/** One tab per router's configuration. The arrow keys move between them, as in any tab list. */
export function FileTabs({ files, activePath, modified, onSelect }: FileTabsProps) {
  const items: TabItem[] = files.map((file) => ({
    id: file.path,
    label: (
      <>
        {file.path}
        {file.readOnly && (
          <svg
            role="img"
            aria-label="read-only"
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current stroke-2"
          >
            <path d="M7 11V7h10v4M5 11h14v10H5z" />
          </svg>
        )}
      </>
    ),
    mark: modified.has(file.path),
    markLabel: 'modified',
  }))
  return (
    <Tabs
      label="Router configurations"
      kind="file"
      items={items}
      selected={activePath}
      onSelect={onSelect}
      idPrefix="editor-file"
    />
  )
}
