import React from 'react';
import { useStore } from '../store/useStore';
import type { PsetData, PropertyEntry } from '../lib/types';

function CoverageChip({ coverage }: { coverage: number }) {
  const pct = Math.round(coverage * 100);
  const colorClass =
    pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-gray-500';
  return <span className={`text-xs font-mono ${colorClass}`}>{pct}%</span>;
}

function PropertyRow({ prop, highlight }: { prop: PropertyEntry; highlight?: string }) {
  const isEmpty = prop.value == null || prop.value === '';
  const valueStr = isEmpty ? null : String(prop.value);

  const highlightText = (text: string) => {
    if (!highlight) return text;
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-600 text-yellow-100 rounded">{text.slice(idx, idx + highlight.length)}</mark>
        {text.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <div className="flex items-start gap-2 py-1 px-2 hover:bg-gray-800 rounded text-xs">
      <span className="flex-shrink-0 text-gray-500 w-44 truncate" title={prop.name}>
        {highlightText(prop.name)}
      </span>
      <span className={`flex-1 truncate font-mono ${isEmpty ? 'text-amber-600 italic' : 'text-gray-300'}`}>
        {isEmpty ? 'vide' : highlightText(String(valueStr))}
        {prop.unit && !isEmpty && (
          <span className="ml-1 text-gray-600">{prop.unit}</span>
        )}
      </span>
    </div>
  );
}

function PsetSection({ pset, coverage, searchQuery }: {
  pset: PsetData;
  coverage: number;
  searchQuery: string;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  const filteredProps = React.useMemo(() => {
    if (!searchQuery) return pset.properties;
    const q = searchQuery.toLowerCase();
    return pset.properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.value != null && String(p.value).toLowerCase().includes(q))
    );
  }, [pset.properties, searchQuery]);

  if (searchQuery && filteredProps.length === 0) return null;

  return (
    <div className="mb-3 border border-gray-800 rounded overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-mono truncate ${pset.isStandard ? 'text-blue-300' : 'text-purple-300'}`}>
            {pset.name}
          </span>
          {!pset.isStandard && (
            <span className="flex-shrink-0 text-xs px-1 py-0.5 bg-purple-900 text-purple-400 rounded text-[10px]">
              custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CoverageChip coverage={coverage} />
          <span className="text-gray-600 text-xs">{collapsed ? '▶' : '▼'}</span>
        </div>
      </button>
      {!collapsed && (
        <div className="py-1">
          {filteredProps.map((prop) => (
            <PropertyRow key={prop.name} prop={prop} highlight={searchQuery || undefined} />
          ))}
          {filteredProps.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600">Aucune propriété</div>
          )}
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { selectedInstance, selectedType, psetCoverage, searchQuery } = useStore();

  const typeCoverage = selectedType ? (psetCoverage[selectedType] ?? []) : [];

  const getCoverage = (psetName: string): number => {
    const found = typeCoverage.find((c) => c.psetName === psetName);
    return found ? found.coverage : 0;
  };

  if (!selectedInstance) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-gray-700 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-600 text-sm px-4">
          <div className="mb-2">Sélectionnez une instance</div>
          <div className="text-xs text-gray-700">dans le tableau central</div>
        </div>
      </div>
    );
  }

  const { globalId, type, name, attributes, psets } = selectedInstance;

  // Filter attributes to show
  const attrEntries = Object.entries(attributes).filter(
    ([key]) => !['expressID', 'type'].includes(key)
  );

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-700 bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="text-xs font-mono text-gray-500 mb-1">{type}</div>
        {name && (
          <div className="text-sm font-semibold text-gray-200 mb-1 truncate" title={name}>
            {name}
          </div>
        )}
        {globalId && (
          <div
            className="text-xs font-mono text-gray-500 truncate cursor-pointer hover:text-blue-400 transition-colors"
            title={`Cliquer pour copier: ${globalId}`}
            onClick={() => navigator.clipboard.writeText(globalId).catch(() => {})}
          >
            {globalId}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Attributes */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Attributs natifs
          </h3>
          <div className="space-y-0.5">
            {attrEntries.length === 0 ? (
              <div className="text-xs text-gray-600">Aucun attribut</div>
            ) : (
              attrEntries.map(([key, value]) => {
                const isEmpty = value == null;
                return (
                  <div key={key} className="flex items-start gap-2 py-0.5 text-xs">
                    <span className="flex-shrink-0 text-gray-500 w-36 truncate" title={key}>
                      {key}
                    </span>
                    <span className={`flex-1 truncate font-mono ${isEmpty ? 'text-amber-600 italic' : 'text-gray-300'}`}>
                      {isEmpty ? 'vide' : String(value)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PSets */}
        {psets.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Property Sets ({psets.length})
            </h3>
            {psets.map((pset) => (
              <PsetSection
                key={pset.name}
                pset={pset}
                coverage={getCoverage(pset.name)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}

        {psets.length === 0 && (
          <div className="text-xs text-gray-600">Aucun PSet défini pour cette instance</div>
        )}
      </div>
    </div>
  );
}
