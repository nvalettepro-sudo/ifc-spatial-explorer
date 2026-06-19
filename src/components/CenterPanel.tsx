import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../store/useStore';
import type { IfcEntity } from '../lib/types';

const columnHelper = createColumnHelper<IfcEntity>();

function matchesSearch(entity: IfcEntity, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();

  for (const pset of entity.psets) {
    if (pset.name.toLowerCase().includes(q)) return true;
    for (const prop of pset.properties) {
      if (prop.name.toLowerCase().includes(q)) return true;
      if (prop.value != null && String(prop.value).toLowerCase().includes(q)) return true;
    }
  }

  return false;
}

export function CenterPanel() {
  const { selectedType, instances, selectInstance, selectedInstance, searchQuery } = useStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery) return instances;
    return instances.filter((inst) => matchesSearch(inst, searchQuery));
  }, [instances, searchQuery]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Nom',
      cell: (info) => info.getValue() ?? <span className="text-gray-600 italic">—</span>,
    }),
    columnHelper.accessor('globalId', {
      header: 'GlobalId',
      cell: (info) => {
        const val = info.getValue();
        if (!val) return <span className="text-gray-600">—</span>;
        return (
          <button
            className="font-mono text-xs text-gray-400 hover:text-blue-400 transition-colors"
            title={`Cliquer pour copier: ${val}`}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(val).catch(() => {});
            }}
          >
            {val.slice(0, 12)}…
          </button>
        );
      },
    }),
    columnHelper.accessor('predefinedType', {
      header: 'Type prédéfini',
      cell: (info) => info.getValue() ?? <span className="text-gray-600">—</span>,
    }),
    columnHelper.accessor('storey', {
      header: 'Niveau',
      cell: (info) => info.getValue() ?? <span className="text-gray-600">—</span>,
    }),
  ], []);

  const table = useReactTable({
    data: filteredBySearch,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const handleExportCSV = useCallback(() => {
    const visibleRows = table.getFilteredRowModel().rows;
    const headers = ['Nom', 'GlobalId', 'Type prédéfini', 'Niveau'];
    const csvRows = [
      headers.join(','),
      ...visibleRows.map((row) => {
        const d = row.original;
        return [
          JSON.stringify(d.name ?? ''),
          JSON.stringify(d.globalId ?? ''),
          JSON.stringify(d.predefinedType ?? ''),
          JSON.stringify(d.storey ?? ''),
        ].join(',');
      }),
    ];
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [table, selectedType]);

  if (!selectedType) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Sélectionnez un type d'entité dans le panneau gauche
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <div>
          <span className="font-mono text-sm text-blue-400">{selectedType}</span>
          <span className="ml-3 text-xs text-gray-500">
            {filteredBySearch.length !== instances.length
              ? `${filteredBySearch.length} / ${instances.length} instances`
              : `${instances.length} instance${instances.length > 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 hover:text-gray-100 transition-colors"
        >
          Exporter CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" ref={tableContainerRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-400 border-b border-gray-700 select-none"
                    style={{ width: header.getSize() }}
                  >
                    <div
                      className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-gray-200' : ''}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <span>↑</span>}
                      {header.column.getIsSorted() === 'desc' && <span>↓</span>}
                    </div>
                    {header.column.getCanFilter() && (
                      <input
                        type="text"
                        placeholder="Filtrer..."
                        value={(header.column.getFilterValue() as string) ?? ''}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                        className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded placeholder-gray-600 focus:outline-none focus:border-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingTop }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isSelected = row.original.expressId === selectedInstance?.expressId;
              return (
                <tr
                  key={row.id}
                  onClick={() => selectInstance(row.original)}
                  className={`cursor-pointer border-b border-gray-800 transition-colors ${
                    isSelected
                      ? 'bg-blue-900 hover:bg-blue-800'
                      : 'hover:bg-gray-800'
                  }`}
                  style={{ height: 36 }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-0 text-gray-300 text-xs truncate max-w-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
            Aucune instance trouvée
          </div>
        )}
      </div>
    </div>
  );
}
