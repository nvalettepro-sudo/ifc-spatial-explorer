import React from 'react';
import { useStore } from '../store/useStore';

export function LeftPanel() {
  const { entityTypes, selectedType, selectType } = useStore();

  const maxCount = entityTypes.length > 0 ? entityTypes[0].count : 1;

  return (
    <div className="flex flex-col w-52 flex-shrink-0 border-r border-gray-700 bg-gray-900 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Types d'entités
          {entityTypes.length > 0 && (
            <span className="ml-2 text-gray-500 normal-case">— {entityTypes.length}</span>
          )}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entityTypes.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-600">
            Chargez un fichier IFC
          </div>
        ) : (
          <ul>
            {entityTypes.map((summary) => {
              const isSelected = summary.type === selectedType;
              const barWidth = Math.max(2, Math.round((summary.count / maxCount) * 100));

              return (
                <li key={summary.type}>
                  <button
                    onClick={() => selectType(summary.type)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors ${
                      isSelected ? 'bg-blue-900 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-mono truncate ${
                          isSelected ? 'text-blue-300' : 'text-gray-300'
                        }`}
                        title={summary.type}
                      >
                        {summary.type}
                      </span>
                      <span className={`text-xs flex-shrink-0 tabular-nums ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>
                        {summary.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isSelected ? 'bg-blue-500' : 'bg-gray-600'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
