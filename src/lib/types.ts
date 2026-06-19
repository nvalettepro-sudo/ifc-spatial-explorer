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

export interface PsetCoverage {
  psetName: string
  coverage: number
  propertyCoverage: Record<string, number>
}

export type WorkerInMessage =
  | { type: 'init'; wasmPath: string }
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'select'; entityType: string }

export type WorkerOutMessage =
  | { type: 'progress'; percent: number; phase: string }
  | { type: 'ready'; entityTypes: EntityTypeSummary[]; ifcVersion: string }
  | { type: 'instances'; instances: IfcEntity[]; psetCoverage: PsetCoverage[] }
  | { type: 'error'; message: string }
