import { useStore } from '../store/useStore'
import type { EntityTypeSummary } from '../lib/types'

function EntityRow({
  summary,
  selected,
  maxCount,
  onClick,
}: {
  summary: EntityTypeSummary
  selected: boolean
  maxCount: number
  onClick: () => void
}) {
  const barWidth = maxCount > 0 ? (summary.count / maxCount) * 100 : 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 group focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
        selected ? 'bg-blue-900/60' : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-xs font-mono truncate ${selected ? 'text-blue-200' : 'text-gray-300 group-hover:text-gray-100'}`}
        >
          {summary.type}
        </span>
        <span className={`text-xs tabular-nums flex-shrink-0 ${selected ? 'text-blue-300' : 'text-gray-500'}`}>
          {summary.count.toLocaleString('fr-FR')}
        </span>
      </div>
      <div className="mt-1 h-0.5 bg-gray-800">
        <div
          className={`h-full transition-all duration-300 ${selected ? 'bg-blue-500' : 'bg-gray-600'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </button>
  )
}

export function LeftPanel() {
  const entityTypes = useStore((s) => s.entityTypes)
  const selectedType = useStore((s) => s.selectedType)
  const selectType = useStore((s) => s.selectType)

  const maxCount = entityTypes.length > 0 ? entityTypes[0].count : 1

  return (
    <div className="flex flex-col h-full border-r border-gray-800 bg-gray-950">
      <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs text-gray-500">
          Types d'entités — {entityTypes.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {entityTypes.map((s) => (
          <EntityRow
            key={s.type}
            summary={s}
            selected={s.type === selectedType}
            maxCount={maxCount}
            onClick={() => selectType(s.type)}
          />
        ))}
      </div>
    </div>
  )
}
