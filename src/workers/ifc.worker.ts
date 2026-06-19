import * as WebIFC from 'web-ifc'
import type {
  EntityTypeSummary,
  IfcEntity,
  PsetData,
  PropertyEntry,
  PsetCoverage,
  WorkerInMessage,
  WorkerOutMessage,
} from '../lib/types'

let api: WebIFC.IfcAPI | null = null
let modelId = -1
let ifcVersion = 'IFC2X3'
let wasmBasePath: string | null = null

// ── caches built once per model ──────────────────────────────────────────────
const typeCodeMap = new Map<string, number>()       // 'IfcWall' → typeID
const entityPsetMap = new Map<number, PsetData[]>() // expressId → psets
const storeyCache = new Map<number, string | null>()
const coverageCache = new Map<string, PsetCoverage[]>()

function post(msg: WorkerOutMessage) {
  self.postMessage(msg)
}

function valueToString(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v
  const obj = v as Record<string, unknown>
  if (obj.value !== undefined) return valueToString(obj.value)
  if (obj.Value !== undefined) return valueToString(obj.Value)
  return String(v)
}

function safeStr(v: unknown): string | null {
  const s = valueToString(v)
  return s === null || s === '' ? null : String(s)
}

async function initApi() {
  const instance = new WebIFC.IfcAPI()
  let wasmPath: string
  if (self.location.protocol === 'app:') {
    wasmPath = 'app:///'
  } else if (wasmBasePath) {
    wasmPath = wasmBasePath
  } else {
    wasmPath = '/'
  }
  instance.SetWasmPath(wasmPath, true)
  await instance.Init()
  api = instance
}

// ── Storey index ──────────────────────────────────────────────────────────────

function buildStoreyCache() {
  if (!api || modelId < 0) return
  const rels = api.GetLineIDsWithType(modelId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE)
  for (let i = 0; i < rels.size(); i++) {
    const rel = api.GetLine(modelId, rels.get(i), false)
    if (!rel) continue
    const structRef = rel.RelatingStructure as Record<string, unknown>
    if (!structRef?.value) continue
    const struct = api.GetLine(modelId, structRef.value as number, false)
    if (!struct) continue
    if (api.GetNameFromTypeCode(struct.type as number) !== 'IfcBuildingStorey') continue
    const storeyName = safeStr(struct.Name)
    const related = rel.RelatedElements
    if (!Array.isArray(related)) continue
    for (const ref of related) {
      const r = ref as Record<string, unknown>
      if (r.value !== undefined) storeyCache.set(r.value as number, storeyName)
    }
  }
}

// ── PSet index ────────────────────────────────────────────────────────────────

function extractPsetFromLine(pDef: Record<string, unknown>): PsetData | null {
  if (!api) return null
  const typeName = api.GetNameFromTypeCode(pDef.type as number)
  if (typeName !== 'IfcPropertySet' && typeName !== 'IfcElementQuantity') return null

  const psetName = safeStr(pDef.Name) ?? 'Unknown'
  const isStandard =
    psetName.startsWith('Pset_') || psetName.startsWith('Qto_') || psetName === 'BaseQuantities'
  const isQuantity = typeName === 'IfcElementQuantity'
  const propsRef = isQuantity ? pDef.Quantities : pDef.HasProperties
  const properties: PropertyEntry[] = []

  if (Array.isArray(propsRef)) {
    for (const propRef of propsRef) {
      const pRef = propRef as Record<string, unknown>
      if (!pRef?.value) continue
      const prop = api.GetLine(modelId, pRef.value as number, false)
      if (!prop) continue

      const propName = safeStr(prop.Name) ?? 'Unknown'
      let propValue: string | number | boolean | null = null
      let unit: string | undefined

      if (isQuantity) {
        const qVal =
          prop.LengthValue ?? prop.AreaValue ?? prop.VolumeValue ??
          prop.WeightValue ?? prop.CountValue ?? prop.TimeValue
        propValue = valueToString(qVal)
      } else {
        const nomVal = prop.NominalValue as Record<string, unknown> | undefined
        if (nomVal?.value !== undefined) propValue = valueToString(nomVal.value)
        const unitRef = prop.Unit as Record<string, unknown> | undefined
        if (unitRef?.value) {
          try {
            const u = api.GetLine(modelId, unitRef.value as number, false)
            if (u) unit = safeStr(u.Name) ?? undefined
          } catch { /* ignore */ }
        }
      }

      properties.push({ name: propName, value: propValue, unit })
    }
  }

  return { name: psetName, isStandard, properties }
}

// Scan all IfcRelDefinesByProperties once and build expressId → psets index
function buildPsetMap() {
  if (!api || modelId < 0) return
  entityPsetMap.clear()

  const rels = api.GetLineIDsWithType(modelId, WebIFC.IFCRELDEFINESBYPROPERTIES)
  for (let i = 0; i < rels.size(); i++) {
    const rel = api.GetLine(modelId, rels.get(i), false)
    if (!rel) continue

    const relatedObjects = rel.RelatedObjects
    if (!Array.isArray(relatedObjects) || relatedObjects.length === 0) continue

    const pDefRef = rel.RelatingPropertyDefinition as Record<string, unknown>
    if (!pDefRef?.value) continue

    const pDef = api.GetLine(modelId, pDefRef.value as number, false)
    if (!pDef) continue

    const pset = extractPsetFromLine(pDef as Record<string, unknown>)
    if (!pset) continue

    for (const objRef of relatedObjects) {
      const o = objRef as Record<string, unknown>
      if (o.value === undefined) continue
      const eid = o.value as number
      if (!entityPsetMap.has(eid)) entityPsetMap.set(eid, [])
      entityPsetMap.get(eid)!.push(pset)
    }
  }
}

// ── Coverage ──────────────────────────────────────────────────────────────────

function computeCoverage(instances: IfcEntity[]): PsetCoverage[] {
  const total = instances.length
  if (total === 0) return []

  const psetMap = new Map<string, {
    count: number
    propCounts: Map<string, { filled: number; total: number }>
  }>()

  for (const inst of instances) {
    for (const pset of inst.psets) {
      if (!psetMap.has(pset.name)) psetMap.set(pset.name, { count: 0, propCounts: new Map() })
      const entry = psetMap.get(pset.name)!
      entry.count++
      for (const prop of pset.properties) {
        if (!entry.propCounts.has(prop.name)) entry.propCounts.set(prop.name, { filled: 0, total: 0 })
        const pc = entry.propCounts.get(prop.name)!
        pc.total++
        if (prop.value !== null && prop.value !== '') pc.filled++
      }
    }
  }

  const result: PsetCoverage[] = []
  for (const [psetName, entry] of psetMap.entries()) {
    const propertyCoverage: Record<string, number> = {}
    for (const [propName, pc] of entry.propCounts.entries()) {
      propertyCoverage[propName] = pc.total > 0 ? pc.filled / pc.total : 0
    }
    result.push({ psetName, coverage: entry.count / total, propertyCoverage })
  }

  return result.sort((a, b) => b.coverage - a.coverage)
}

// ── File loading ──────────────────────────────────────────────────────────────

async function loadFile(buffer: ArrayBuffer) {
  post({ type: 'progress', percent: 5, phase: 'Initialisation du moteur IFC…' })
  await initApi()
  if (!api) return

  post({ type: 'progress', percent: 15, phase: 'Chargement du fichier…' })

  try {
    modelId = api.OpenModel(new Uint8Array(buffer), { COORDINATE_TO_ORIGIN: false })
  } catch (e) {
    post({ type: 'error', message: `Erreur de chargement: ${e}` })
    return
  }

  // Reset all caches
  typeCodeMap.clear()
  entityPsetMap.clear()
  storeyCache.clear()
  coverageCache.clear()

  // Detect IFC version from schema header
  try {
    const header = api.GetModelSchema(modelId)
    if (header?.includes('IFC4X3') || header?.includes('IFC4x3')) ifcVersion = 'IFC4X3'
    else if (header?.includes('IFC4')) ifcVersion = 'IFC4'
    else ifcVersion = 'IFC2X3'
  } catch { ifcVersion = 'IFC2X3' }

  post({ type: 'progress', percent: 25, phase: 'Index des niveaux…' })
  buildStoreyCache()

  post({ type: 'progress', percent: 40, phase: 'Index des propriétés (Psets)…' })
  buildPsetMap()

  post({ type: 'progress', percent: 60, phase: 'Analyse des types d\'entités…' })

  const typeSummaries: EntityTypeSummary[] = []
  const allTypes = api.GetAllTypesOfModel(modelId)

  for (let i = 0; i < allTypes.length; i++) {
    const { typeID, typeName } = allTypes[i]
    if (!typeName || !typeName.startsWith('Ifc') || typeName.startsWith('IfcRel')) continue

    const lineIds = api.GetLineIDsWithType(modelId, typeID)
    const count = lineIds.size()
    if (count === 0) continue

    typeCodeMap.set(typeName, typeID)
    typeSummaries.push({ type: typeName, count, storeyBreakdown: {} })

    if (i % 50 === 0) {
      const pct = 60 + Math.round((i / allTypes.length) * 30)
      post({ type: 'progress', percent: pct, phase: `Types… (${i}/${allTypes.length})` })
    }
  }

  typeSummaries.sort((a, b) => b.count - a.count)

  post({ type: 'progress', percent: 95, phase: 'Finalisation…' })
  post({ type: 'ready', entityTypes: typeSummaries, ifcVersion })
}

// ── Type selection ────────────────────────────────────────────────────────────

async function selectEntityType(entityType: string) {
  if (!api || modelId < 0) return

  post({ type: 'progress', percent: 10, phase: `Chargement des ${entityType}…` })

  // Use the typeCode from initial scan — reliable, avoids GetTypeCodeFromName mismatches
  const typeCode = typeCodeMap.get(entityType)
  if (typeCode === undefined) {
    post({ type: 'error', message: `Type inconnu: ${entityType}` })
    return
  }

  const lineIds = api.GetLineIDsWithType(modelId, typeCode)
  const total = lineIds.size()
  const instances: IfcEntity[] = []

  for (let i = 0; i < total; i++) {
    const expressId = lineIds.get(i)

    let line: Record<string, unknown>
    try {
      line = api.GetLine(modelId, expressId, false) as Record<string, unknown>
    } catch { continue }

    const name = safeStr(line.Name)
    const globalId = safeStr(line.GlobalId)
    const predefinedType = safeStr(line.PredefinedType)
    const storey = storeyCache.get(expressId) ?? null

    // Native attributes
    const attributes: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of Object.entries(line)) {
      if (k === 'expressID' || k === 'type') continue
      const val = valueToString(v)
      if (val !== null) attributes[k] = val
    }

    // PSets from pre-built index (O(1) per entity)
    const psets = entityPsetMap.get(expressId) ?? []

    instances.push({ expressId, type: entityType, name, globalId, predefinedType, storey, attributes, psets })

    if (i % 200 === 0) {
      const pct = 10 + Math.round((i / total) * 85)
      post({ type: 'progress', percent: pct, phase: `${i + 1}/${total} ${entityType}…` })
    }
  }

  let coverage: PsetCoverage[]
  if (coverageCache.has(entityType)) {
    coverage = coverageCache.get(entityType)!
  } else {
    coverage = computeCoverage(instances)
    coverageCache.set(entityType, coverage)
  }

  post({ type: 'progress', percent: 100, phase: 'Terminé' })
  post({ type: 'instances', instances, psetCoverage: coverage })
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  try {
    if (msg.type === 'init') {
      wasmBasePath = msg.wasmPath
    } else if (msg.type === 'load') {
      await loadFile(msg.buffer)
    } else if (msg.type === 'select') {
      await selectEntityType(msg.entityType)
    }
  } catch (err) {
    post({ type: 'error', message: String(err) })
  }
}
