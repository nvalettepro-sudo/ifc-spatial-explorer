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

// cache: expressId → storey name
const storeyCache = new Map<number, string | null>()
// cache: type → coverage
const coverageCache = new Map<string, PsetCoverage[]>()

function post(msg: WorkerOutMessage) {
  self.postMessage(msg)
}

function valueToString(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v
  // web-ifc typed value objects
  const obj = v as Record<string, unknown>
  if (obj.value !== undefined) return valueToString(obj.value)
  if (obj.Value !== undefined) return valueToString(obj.Value)
  if (typeof obj.type === 'number' && obj.value !== undefined) return valueToString(obj.value)
  return String(v)
}

function safeStr(v: unknown): string | null {
  const s = valueToString(v)
  if (s === null || s === '') return null
  return String(s)
}

async function initApi() {
  const instance = new WebIFC.IfcAPI()
  instance.SetWasmPath('/', true)
  await instance.Init()
  api = instance
}

function getStorey(entityExpressId: number): string | null {
  if (!api || modelId < 0) return null
  if (storeyCache.has(entityExpressId)) return storeyCache.get(entityExpressId)!

  // Walk IfcRelContainedInSpatialStructure
  const rels = api.GetLineIDsWithType(modelId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE)
  for (let i = 0; i < rels.size(); i++) {
    const relId = rels.get(i)
    const rel = api.GetLine(modelId, relId, false)
    if (!rel) continue
    const relatedElements = rel.RelatedElements
    if (!Array.isArray(relatedElements)) continue
    const found = relatedElements.some((el: unknown) => {
      const elObj = el as Record<string, unknown>
      return elObj.value === entityExpressId
    })
    if (found) {
      const structureRef = rel.RelatingStructure as Record<string, unknown>
      if (structureRef?.value) {
        const structId = structureRef.value as number
        const struct = api.GetLine(modelId, structId, false)
        if (struct) {
          const typeName = api.GetNameFromTypeCode(struct.type as number)
          if (typeName === 'IFCBUILDINGSTOREY') {
            const name = safeStr(struct.Name)
            storeyCache.set(entityExpressId, name)
            return name
          }
        }
      }
    }
  }
  storeyCache.set(entityExpressId, null)
  return null
}

// Map from expressId → list of pset data, built lazily per type
function getPsets(expressId: number): PsetData[] {
  if (!api || modelId < 0) return []

  const psets: PsetData[] = []
  const rels = api.GetLineIDsWithType(modelId, WebIFC.IFCRELDEFINESBYPROPERTIES)

  for (let i = 0; i < rels.size(); i++) {
    const relId = rels.get(i)
    const rel = api.GetLine(modelId, relId, false)
    if (!rel) continue

    const relatedObjects = rel.RelatedObjects
    if (!Array.isArray(relatedObjects)) continue

    const found = relatedObjects.some((obj: unknown) => {
      const o = obj as Record<string, unknown>
      return o.value === expressId
    })
    if (!found) continue

    const pDefRef = rel.RelatingPropertyDefinition as Record<string, unknown>
    if (!pDefRef?.value) continue

    const pDefId = pDefRef.value as number
    const pDef = api.GetLine(modelId, pDefId, false)
    if (!pDef) continue

    const typeName = api.GetNameFromTypeCode(pDef.type as number)
    if (typeName !== 'IFCPROPERTYSET' && typeName !== 'IFCELEMENTQUANTITY') continue

    const psetName = safeStr(pDef.Name) ?? 'Unknown'
    const isStandard =
      psetName.startsWith('Pset_') || psetName.startsWith('Qto_') || psetName === 'BaseQuantities'

    const properties: PropertyEntry[] = []
    const hasQuants = typeName === 'IFCELEMENTQUANTITY'
    const propsRef = hasQuants ? pDef.Quantities : pDef.HasProperties

    if (Array.isArray(propsRef)) {
      for (const propRef of propsRef) {
        const pRef = propRef as Record<string, unknown>
        if (!pRef?.value) continue
        const propId = pRef.value as number
        const prop = api.GetLine(modelId, propId, false)
        if (!prop) continue

        const propName = safeStr(prop.Name) ?? 'Unknown'
        let propValue: string | number | boolean | null = null
        let unit: string | undefined

        if (hasQuants) {
          // IfcQuantityLength, IfcQuantityArea, etc.
          const qVal =
            prop.LengthValue ??
            prop.AreaValue ??
            prop.VolumeValue ??
            prop.WeightValue ??
            prop.CountValue ??
            prop.TimeValue
          propValue = valueToString(qVal)
        } else {
          // IfcPropertySingleValue
          const nomVal = prop.NominalValue as Record<string, unknown> | undefined
          if (nomVal?.value !== undefined) {
            propValue = valueToString(nomVal.value)
          }
          const unitRef = prop.Unit as Record<string, unknown> | undefined
          if (unitRef?.value) {
            try {
              const unitLine = api.GetLine(modelId, unitRef.value as number, false)
              if (unitLine) {
                unit = safeStr(unitLine.Name) ?? undefined
              }
            } catch {
              // ignore
            }
          }
        }

        properties.push({ name: propName, value: propValue, unit })
      }
    }

    psets.push({ name: psetName, isStandard, properties })
  }

  return psets
}

function computeCoverage(instances: IfcEntity[]): PsetCoverage[] {
  const total = instances.length
  if (total === 0) return []

  const psetMap = new Map<string, { count: number; propCounts: Map<string, { filled: number; total: number }> }>()

  for (const inst of instances) {
    for (const pset of inst.psets) {
      if (!psetMap.has(pset.name)) {
        psetMap.set(pset.name, { count: 0, propCounts: new Map() })
      }
      const entry = psetMap.get(pset.name)!
      entry.count++
      for (const prop of pset.properties) {
        if (!entry.propCounts.has(prop.name)) {
          entry.propCounts.set(prop.name, { filled: 0, total: 0 })
        }
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
    result.push({
      psetName,
      coverage: entry.count / total,
      propertyCoverage,
    })
  }

  return result.sort((a, b) => b.coverage - a.coverage)
}

async function loadFile(buffer: ArrayBuffer) {
  post({ type: 'progress', percent: 5, phase: 'Initialisation du moteur IFC…' })
  await initApi()
  if (!api) return

  post({ type: 'progress', percent: 15, phase: 'Chargement du fichier…' })

  try {
    modelId = api.OpenModel(new Uint8Array(buffer), {
      COORDINATE_TO_ORIGIN: false,
    })
  } catch (e) {
    post({ type: 'error', message: `Erreur de chargement: ${e}` })
    return
  }

  // Detect IFC version
  try {
    const header = api.GetModelSchema(modelId)
    if (header) {
      if (header.includes('IFC4X3') || header.includes('IFC4x3')) {
        ifcVersion = 'IFC4X3'
      } else if (header.includes('IFC4')) {
        ifcVersion = 'IFC4'
      } else {
        ifcVersion = 'IFC2X3'
      }
    }
  } catch {
    ifcVersion = 'IFC2X3'
  }

  post({ type: 'progress', percent: 30, phase: 'Analyse des types d\'entités…' })

  // Enumerate all types
  const typeSummaries: EntityTypeSummary[] = []
  const allTypes = api.GetAllTypesOfModel(modelId)  // returns IfcType[]

  let processed = 0
  const typeTotal = allTypes.length

  for (let i = 0; i < typeTotal; i++) {
    const ifcType = allTypes[i]
    const typeCode = ifcType.typeID
    const typeName = ifcType.typeName  // e.g. "IFCWALL"
    if (!typeName || typeName.startsWith('IFCREL') || !typeName.startsWith('IFC')) continue

    const lineIds = api.GetLineIDsWithType(modelId, typeCode)
    const count = lineIds.size()
    if (count === 0) continue

    // Convert IFCWALL → IfcWall
    const properName = 'Ifc' + typeName.slice(3).charAt(0).toUpperCase() + typeName.slice(4).toLowerCase()

    typeSummaries.push({
      type: properName,
      count,
      storeyBreakdown: {},
    })

    processed++
    if (processed % 50 === 0) {
      const pct = 30 + Math.round((processed / typeTotal) * 40)
      post({ type: 'progress', percent: pct, phase: `Analyse des types… (${processed}/${typeTotal})` })
    }
  }

  typeSummaries.sort((a, b) => b.count - a.count)

  post({ type: 'progress', percent: 95, phase: 'Finalisation…' })
  post({ type: 'ready', entityTypes: typeSummaries, ifcVersion })
}

async function selectEntityType(entityType: string) {
  if (!api || modelId < 0) return

  if (coverageCache.has(entityType)) {
    // Already computed — but we still need to re-fetch instances (they may not be cached)
  }

  post({ type: 'progress', percent: 10, phase: `Chargement des ${entityType}…` })

  // Convert PascalCase IfcWall → IFCWALL for web-ifc
  const typeCodeName = entityType.toUpperCase()
  const typeCode = (WebIFC as Record<string, unknown>)[typeCodeName] as number | undefined
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
    } catch {
      continue
    }

    const name = safeStr(line.Name)
    const globalId = safeStr(line.GlobalId)
    const predefinedType = safeStr(line.PredefinedType)
    const storey = getStorey(expressId)

    // Build attributes map (all native attrs)
    const attributes: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of Object.entries(line)) {
      if (k === 'expressID' || k === 'type') continue
      const val = valueToString(v)
      if (val !== null) attributes[k] = val
    }

    const psets = getPsets(expressId)

    instances.push({
      expressId,
      type: entityType,
      name,
      globalId,
      predefinedType,
      storey,
      attributes,
      psets,
    })

    if (i % 100 === 0) {
      const pct = 10 + Math.round((i / total) * 80)
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

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  try {
    if (msg.type === 'load') {
      await loadFile(msg.buffer)
    } else if (msg.type === 'select') {
      await selectEntityType(msg.entityType)
    }
  } catch (err) {
    post({ type: 'error', message: String(err) })
  }
}
