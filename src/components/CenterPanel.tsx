import { useMemo, useRef, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/useStore'
import type { IfcEntity } from '../lib/types'

const columnHelper = createColumnHelper<IfcEntity>()

function SortIcon({ dir }: { dir: 'asc' | 'desc' | false }) {
  if (!dir) return <span className="ml-1 text-gray-700">⇅</span>
  return <span className="ml-1 text-blue-400">{dir === 'asc' ? '↑' : '↓'}</span>
}

function CopyableId({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span className="text-gray-700">—</span>

  const short = value.length > 12 ? value.slice(0, 12) + '…' : value

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <button
      onClick={copy}
      title={value}
      className="font-mono text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
    >
      {copied ? <span className="text-green-400">✓ copié</span> : short}
    </button>
  )
}

function exportCSV(rows: IfcEntity[], columns: string[]) {
  const header = columns.join(',')
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const v = col === 'Name' ? row.name : col === 'GlobalId' ? row.globalId : col === 'PredefinedType' ? row.predefinedType : col === 'Storey' ? row.storey : null
          return `"${String(v ?? '').replace(/"/g, '""')}"`
        })
        .join(',')
    )
    .join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function CenterPanel() {
  const selectedType = useStore((s) => s.selectedType)
  const instances = useStore((s) => s.instances)
  const selectInstance = useStore((s) => s.selectInstance)
  const selectedInstance = useStore((s) => s.selectedInstance)
  const searchQuery = useStore((s) => s.searchQuery)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Global search filter — filter instances by pset/property/value matching
  const filteredInstances = useMemo(() => {
    if (!searchQuery.trim()) return instances
    const q = searchQuery.toLowerCase()
    return instances.filter((inst) => {
      if (inst.name?.toLowerCase().includes(q)) return true
      if (inst.globalId?.toLowerCase().includes(q)) return true
      for (const pset of inst.psets) {
        if (pset.name.toLowerCase().includes(q)) return true
        for (const prop of pset.properties) {
          if (prop.name.toLowerCase().includes(q)) return true
          if (String(prop.value ?? '').toLowerCase().includes(q)) return true
        }
      }
      return false
    })
  }, [instances, searchQuery])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'Name',
        header: 'Name',
        cell: (info) => (
          <span className="text-gray-200 truncate block max-w-[200px]">
            {info.getValue() ?? <span className="text-gray-600">—</span>}
          </span>
        ),
      }),
      columnHelper.accessor('globalId', {
        id: 'GlobalId',
        header: 'GlobalId',
        cell: (info) => <CopyableId value={info.getValue()} />,
      }),
      columnHelper.accessor('predefinedType', {
        id: 'PredefinedType',
        header: 'PredefinedType',
        cell: (info) => (
          <span className="font-mono text-xs text-gray-400">
            {info.getValue() ?? <span className="text-gray-700">—</span>}
          </span>
        ),
      }),
      columnHelper.accessor('storey', {
        id: 'Storey',
        header: 'Niveau',
        cell: (info) => (
          <span className="text-xs text-gray-400">
            {info.getValue() ?? <span className="text-gray-700">—</span>}
          </span>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filteredInstances,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const { rows } = table.getRowModel()

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  })

  const handleExportCSV = useCallback(() => {
    exportCSV(
      rows.map((r) => r.original),
      ['Name', 'GlobalId', 'PredefinedType', 'Storey']
    )
  }, [rows])

  if (!selectedType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm">Sélectionner un type d'entité</p>
      </div>
    )
  }

  const hiddenCount = instances.length - rows.length

  return (
    <div className="flex-1 flex flex-col bg-gray-950 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs text-gray-500">
          {instances.length.toLocaleString('fr-FR')} occurrence{instances.length > 1 ? 's' : ''}
          {' '}— colonnes communes à tous les {selectedType}
        </span>
        <button
          onClick={handleExportCSV}
          className="px-2 py-1 text-xs text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors"
        >
          Exporter CSV
        </button>
      </div>

      {/* Column filter row */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {table.getHeaderGroups().map((hg) =>
          hg.headers.map((header) => (
            <div
              key={header.id}
              className="px-2 py-1 flex-1 min-w-0"
              style={{ width: header.getSize() }}
            >
              <input
                type="text"
                placeholder="Filtrer…"
                value={(header.column.getFilterValue() as string) ?? ''}
                onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                className="w-full text-xs bg-gray-900 border border-gray-800 text-gray-400 placeholder-gray-700 px-1.5 py-0.5 focus:outline-none focus:border-gray-600"
              />
            </div>
          ))
        )}
      </div>

      {/* Table header */}
      <div className="flex bg-gray-900 border-b border-gray-800 flex-shrink-0">
        {table.getHeaderGroups().map((hg) =>
          hg.headers.map((header) => (
            <div
              key={header.id}
              className="flex-1 min-w-0 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors"
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              <SortIcon dir={header.column.getIsSorted()} />
            </div>
          ))
        )}
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((vRow) => {
            const row = rows[vRow.index]
            const isSelected = row.original.expressId === selectedInstance?.expressId
            return (
              <div
                key={vRow.key}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                onClick={() => selectInstance(row.original)}
                className={`absolute left-0 right-0 flex items-center cursor-pointer border-b border-gray-900 ${
                  isSelected ? 'bg-blue-900/50' : 'hover:bg-gray-900'
                }`}
                style={{ top: `${vRow.start}px` }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="flex-1 min-w-0 px-3 py-2 text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      {(hiddenCount > 0 || rows.length === 0) && (
        <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-600">
            {rows.length > 0
              ? `${hiddenCount.toLocaleString('fr-FR')} lignes masquées par les filtres`
              : 'Aucun résultat'}
          </span>
          {(columnFilters.length > 0 || searchQuery) && (
            <button
              onClick={() => {
                setColumnFilters([])
                useStore.getState().setSearchQuery('')
              }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  )
}
