export interface PropertyEntry {
  name: string
  value: string | number | boolean | null
  unit?: string
}

export interface PsetData {
  name: string
  isStandard: boolean
  properties: PropertyEntry[]
}

export interface IfcEntity {
  expressId: number
  type: string
  name: string | null
  globalId: string | null
  predefinedType: string | null
  storey: string | null
  attributes: Record<string, string | number | boolean | null>
  psets: PsetData[]
}

export interface EntityTypeSummary {
  type: string
  count: number
  storeyBreakdown: Record<string, number>
}

// ── Aggregation types ─────────────────────────────────────────────────────────

export interface TextValueCount {
  value: string
  count: number
}

export interface ValueAggregate {
  kind: 'text' | 'numeric' | 'empty'
  distinctValues?: TextValueCount[]  // for text
  min?: number                       // for numeric
  max?: number                       // for numeric
  presentCount: number               // instances with a non-null value
  totalCount: number                 // total instances of the type
}

export interface AggregatedProperty {
  name: string
  aggregate: ValueAggregate
}

export interface AggregatedPset {
  name: string
  isStandard: boolean
  presentCount: number   // instances that have this pset
  totalCount: number
  properties: AggregatedProperty[]
}

export interface AggregatedEntityData {
  entityType: string
  totalCount: number
  attributes: AggregatedProperty[]
  standardPsets: AggregatedPset[]
  customPsets: AggregatedPset[]
}

// ── Worker messages ───────────────────────────────────────────────────────────

export type WorkerInMessage =
  | { type: 'init'; wasmPath: string }
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'select'; entityType: string }

export type WorkerOutMessage =
  | { type: 'progress'; percent: number; phase: string }
  | { type: 'ready'; entityTypes: EntityTypeSummary[]; ifcVersion: string }
  | { type: 'aggregated'; data: AggregatedEntityData }
  | { type: 'error'; message: string }
