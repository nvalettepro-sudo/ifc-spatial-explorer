import React from 'react';
import { useStore } from '../store/useStore';

export function TopBar() {
  const { fileName, ifcVersion, isLoading, loadProgress, loadPhase, searchQuery, setSearchQuery } = useStore();

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center h-12 px-4 bg-gray-900 border-b border-gray-700 gap-4">
        {/* Filename */}
        <div className="flex-shrink-0 min-w-0 max-w-xs">
          {fileName ? (
            <span className="text-sm text-gray-200 truncate block font-mono" title={fileName}>
              {fileName}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Aucun fichier chargé</span>
          )}
        </div>

        {/* IFC Version Badge */}
        {ifcVersion && !isLoading && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-blue-100 text-xs font-mono rounded">
            {ifcVersion}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Search */}
        {fileName && !isLoading && (
          <input
            type="text"
            placeholder="Rechercher (PSets, propriétés, valeurs)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 px-3 py-1.5 bg-gray-800 text-gray-200 text-sm border border-gray-600 rounded placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        )}
      </div>

      {/* Progress bar */}
      {isLoading && (
        <div className="h-1 bg-gray-800 relative">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      )}
      {isLoading && (
        <div className="px-4 py-1 bg-gray-900 border-b border-gray-700">
          <span className="text-xs text-gray-400">{loadPhase}</span>
        </div>
      )}
    </div>
  );
}
