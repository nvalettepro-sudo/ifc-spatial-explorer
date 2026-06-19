import { useStore } from '../store/useStore'
import type { PsetData, PropertyEntry, PsetCoverage } from '../lib/types'

function CoverageBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-mono ${color}`}>{pct}%</span>
}

function PropRow({
  prop,
  fillRate,
}: {
  prop: PropertyEntry
  fillRate: number | undefined
}) {
  const isEmpty = prop.value === null || prop.value === ''
  return (
    <div className="flex items-baseline justify-between py-0.5 gap-2">
      <span
        className={`text-xs truncate max-w-[180px] ${isEmpty ? 'text-amber-500' : 'text-gray-400'}`}
      >
        {isEmpty && (
          <span
            className="inline-block w-2 h-2 border border-amber-500 mr-1 flex-shrink-0"
            title="Valeur vide"
          />
        )}
        {prop.name}
      </span>
      <span className={`text-xs text-right flex-shrink-0 ${isEmpty ? 'text-gray-600 italic' : 'text-gray-300'}`}>
        {isEmpty ? 'vide' : String(prop.value)}
        {prop.unit && !isEmpty ? ` ${prop.unit}` : ''}
      </span>
    </div>
  )
}

function PsetBlock({
  pset,
  coverage,
  searchQuery,
}: {
  pset: PsetData
  coverage: PsetCoverage | undefined
  searchQuery: string
}) {
  const q = searchQuery.toLowerCase()
  const isHighlighted = q && (pset.name.toLowerCase().includes(q))

  return (
    <div
      className={`mb-4 ${isHighlighted ? 'ring-1 ring-blue-700 ring-inset' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-gray-400 truncate">{pset.name}</span>
          {!pset.isStandard && (
            <span className="text-xs text-gray-600 flex-shrink-0">(custom)</span>
          )}
        </div>
        {coverage !== undefined && (
          <CoverageBar value={coverage.coverage} />
        )}
      </div>
      <div className="pl-2 border-l border-gray-800">
        {pset.properties.map((prop) => (
          <PropRow
            key={prop.name}
            prop={prop}
            fillRate={coverage?.propertyCoverage[prop.name]}
          />
        ))}
        {pset.properties.length === 0 && (
          <span className="text-xs text-gray-700 italic">Aucune propriété</span>
        )}
      </div>
    </div>
  )
}

function AttrSection({ attrs }: { attrs: Record<string, string | number | boolean | null> }) {
  const entries = Object.entries(attrs).filter(([k]) => k !== 'expressID')
  if (entries.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
        Attributs
      </h3>
      <div className="pl-2 border-l border-gray-800">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between py-0.5 gap-2">
            <span className="text-xs text-gray-500 truncate max-w-[140px]">{k}</span>
            <span className="text-xs text-gray-300 text-right flex-shrink-0 max-w-[160px] truncate">
              {v === null || v === '' ? (
                <span className="text-gray-700 italic">—</span>
              ) : (
                String(v)
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RightPanel() {
  const selectedInstance = useStore((s) => s.selectedInstance)
  const psetCoverage = useStore((s) => s.psetCoverage)
  const searchQuery = useStore((s) => s.searchQuery)

  if (!selectedInstance) {
    return (
      <div className="flex items-center justify-center h-full border-l border-gray-800 bg-gray-950">
        <p className="text-gray-600 text-xs">Sélectionner une ligne</p>
      </div>
    )
  }

  const { globalId, attributes, psets } = selectedInstance

  const coverageMap = new Map(psetCoverage.map((c) => [c.psetName, c]))

  // Separate attributes shown in detail from the redundant ones
  const cleanedAttrs: Record<string, string | number | boolean | null> = {}
  const skipKeys = new Set(['GlobalId', 'Name', 'PredefinedType', 'ObjectType', 'Description', 'Tag', 'ObjectPlacement', 'Representation', 'OwnerHistory'])
  for (const [k, v] of Object.entries(attributes)) {
    if (!skipKeys.has(k)) cleanedAttrs[k] = v
  }

  // Simple attrs to show prominently
  const quickAttrs: Record<string, string | number | boolean | null> = {}
  for (const key of ['ObjectType', 'PredefinedType', 'Tag', 'Description']) {
    if (key in attributes) quickAttrs[key] = attributes[key]
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-800 bg-gray-950">
      <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Détail
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        {/* GlobalId */}
        {globalId && (
          <div className="mb-4">
            <button
              onClick={() => navigator.clipboard.writeText(globalId)}
              title="Copier le GlobalId"
              className="font-mono text-xs text-gray-500 hover:text-gray-300 break-all transition-colors"
            >
              {globalId}
            </button>
          </div>
        )}

        {/* Quick attributes */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
            Attributs
          </h3>
          <div className="pl-2 border-l border-gray-800">
            {Object.entries(quickAttrs).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between py-0.5 gap-2">
                <span className="text-xs text-gray-500">{k}</span>
                <span className={`text-xs text-right ${v === null || v === '' ? 'text-gray-700 italic' : 'text-gray-300'}`}>
                  {v === null || v === '' ? '—' : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PSets and QSets */}
        {psets.length > 0 ? (
          psets.map((pset) => (
            <PsetBlock
              key={pset.name}
              pset={pset}
              coverage={coverageMap.get(pset.name)}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <p className="text-xs text-gray-700 italic">Aucun Pset associé</p>
        )}
      </div>
    </div>
  )
}
