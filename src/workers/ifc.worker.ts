import * as WebIFC from 'web-ifc';
import type {
  EntityTypeSummary,
  IfcEntity,
  PsetData,
  PropertyEntry,
  PsetCoverage,
  WorkerInMessage,
  WorkerOutMessage,
} from '../lib/types';

const api = new WebIFC.IfcAPI();
let modelId = -1;

// Map from expressId → storey name (cached)
const storeyCache = new Map<number, string | null>();
// Map from expressId → psets (cached)
const psetCache = new Map<number, PsetData[]>();
// Per-type coverage cache
const coverageCache = new Map<string, PsetCoverage[]>();

function postMsg(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

async function initApi() {
  api.SetWasmPath('/');
  await api.Init();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeGetValue(val: any): string | number | boolean | null {
  if (val == null) return null;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (typeof val === 'object' && 'value' in val) {
    const v = val.value;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      return v;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStringValue(val: any): string | null {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && 'value' in val && typeof val.value === 'string') {
    return val.value;
  }
  return null;
}

function getTypeName(typeCode: number): string {
  try {
    return api.GetNameFromTypeCode(typeCode) || `TYPE_${typeCode}`;
  } catch {
    return `TYPE_${typeCode}`;
  }
}

function resolveStorey(expressId: number): string | null {
  if (storeyCache.has(expressId)) return storeyCache.get(expressId)!;

  try {
    // Get all IfcRelContainedInSpatialStructure
    const relIds = api.GetLineIDsWithType(modelId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
    for (let i = 0; i < relIds.size(); i++) {
      const relId = relIds.get(i);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rel: any = api.GetLine(modelId, relId, true);
      const relatedElements = rel['RelatedElements'];
      if (!relatedElements) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasElement = (relatedElements as any[]).some((el: any) => {
        if (typeof el === 'object' && el !== null) {
          return el['expressID'] === expressId || el['value'] === expressId;
        }
        return el === expressId;
      });

      if (!hasElement) continue;

      const structRef = rel['RelatingStructure'];
      if (!structRef) continue;

      const structId: number = structRef['expressID'] ?? structRef['value'];
      if (structId == null) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const struct: any = api.GetLine(modelId, structId, false);
      const typeCode = struct['type'] as number;
      const typeName = getTypeName(typeCode);

      if (typeName === 'IFCBUILDINGSTOREY') {
        const name = extractStringValue(struct['Name']) ?? `Storey_${structId}`;
        storeyCache.set(expressId, name);
        return name;
      }

      // Walk up through IfcRelAggregates to find parent storey
      const aggIds = api.GetLineIDsWithType(modelId, WebIFC.IFCRELAGGREGATES);
      for (let j = 0; j < aggIds.size(); j++) {
        const aggId = aggIds.get(j);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agg: any = api.GetLine(modelId, aggId, true);
        const parts = agg['RelatedObjects'];
        if (!parts) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasPart = (parts as any[]).some((p: any) => {
          if (typeof p === 'object' && p !== null) {
            return p['expressID'] === structId || p['value'] === structId;
          }
          return p === structId;
        });
        if (hasPart) {
          const parentRef = agg['RelatingObject'];
          if (!parentRef) continue;
          const parentId: number = parentRef['expressID'] ?? parentRef['value'];
          if (parentId == null) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent: any = api.GetLine(modelId, parentId, false);
          const parentTypeName = getTypeName(parent['type'] as number);
          if (parentTypeName === 'IFCBUILDINGSTOREY') {
            const name = extractStringValue(parent['Name']) ?? `Storey_${parentId}`;
            storeyCache.set(expressId, name);
            return name;
          }
        }
      }
    }
  } catch {
    // Ignore errors in storey resolution
  }

  storeyCache.set(expressId, null);
  return null;
}

function resolvePsets(expressId: number): PsetData[] {
  if (psetCache.has(expressId)) return psetCache.get(expressId)!;

  const psets: PsetData[] = [];

  try {
    const relIds = api.GetLineIDsWithType(modelId, WebIFC.IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relIds.size(); i++) {
      const relId = relIds.get(i);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rel: any = api.GetLine(modelId, relId, true);
      const relatedObjects = rel['RelatedObjects'];
      if (!relatedObjects) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasEntity = (relatedObjects as any[]).some((obj: any) => {
        if (typeof obj === 'object' && obj !== null) {
          return obj['expressID'] === expressId || obj['value'] === expressId;
        }
        return obj === expressId;
      });

      if (!hasEntity) continue;

      const defRef = rel['RelatingPropertyDefinition'];
      if (!defRef) continue;

      const defId: number = defRef['expressID'] ?? defRef['value'];
      if (defId == null) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def: any = api.GetLine(modelId, defId, false);
      const defType = getTypeName(def['type'] as number);

      if (defType !== 'IFCPROPERTYSET') continue;

      const psetName = extractStringValue(def['Name']) ?? 'Unknown';
      const isStandard = psetName.startsWith('Pset_');

      // Get full pset with properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullDef: any = api.GetLine(modelId, defId, true);
      const props = fullDef['HasProperties'];
      const properties: PropertyEntry[] = [];

      if (props) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const prop of (props as any[])) {
          if (typeof prop !== 'object' || prop === null) continue;
          const propType = getTypeName(prop['type'] as number);
          const propName = extractStringValue(prop['Name']) ?? 'Unknown';

          if (propType === 'IFCPROPERTYSINGLEVALUE') {
            const nomVal = prop['NominalValue'];
            let value: string | number | boolean | null = null;
            let unit: string | undefined;

            if (nomVal) {
              value = safeGetValue(nomVal);
              // Try to get unit
              const unitRef = prop['Unit'];
              if (unitRef) {
                const unitId: number = unitRef['expressID'] ?? unitRef['value'];
                if (unitId != null) {
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const unitLine: any = api.GetLine(modelId, unitId, false);
                    unit = extractStringValue(unitLine['Name']) ?? undefined;
                  } catch {
                    // ignore
                  }
                }
              }
            }

            properties.push({ name: propName, value, unit });
          } else if (propType === 'IFCPROPERTYENUMERATEDVALUE') {
            const enumVals = prop['EnumerationValues'];
            if (enumVals && (enumVals as unknown[]).length > 0) {
              properties.push({ name: propName, value: safeGetValue((enumVals as unknown[])[0]) });
            } else {
              properties.push({ name: propName, value: null });
            }
          } else {
            properties.push({ name: propName, value: null });
          }
        }
      }

      psets.push({ name: psetName, isStandard, properties });
    }
  } catch {
    // Ignore errors
  }

  psetCache.set(expressId, psets);
  return psets;
}

function extractEntity(expressId: number, typeName: string): IfcEntity {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const line: any = api.GetLine(modelId, expressId, false);

  const name = extractStringValue(line['Name']);
  const globalId = extractStringValue(line['GlobalId']);
  const predefinedTypeRaw = line['PredefinedType'];
  let predefinedType: string | null = null;
  if (predefinedTypeRaw != null) {
    predefinedType = extractStringValue(predefinedTypeRaw) ?? String(predefinedTypeRaw);
    if (predefinedType === 'null') predefinedType = null;
  }

  // Build attributes dict from all fields
  const attributes: Record<string, string | number | boolean | null> = {};
  for (const [key, val] of Object.entries(line as Record<string, unknown>)) {
    if (key === 'expressID' || key === 'type') continue;
    if (val === null || val === undefined) {
      attributes[key] = null;
    } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      attributes[key] = val;
    } else if (typeof val === 'object') {
      const v = val as Record<string, unknown>;
      if ('value' in v) {
        const sv = v.value;
        if (typeof sv === 'string' || typeof sv === 'number' || typeof sv === 'boolean' || sv === null) {
          attributes[key] = sv as string | number | boolean | null;
        }
      }
    }
  }

  const storey = resolveStorey(expressId);
  const psets = resolvePsets(expressId);

  return {
    expressId,
    type: typeName,
    name,
    globalId,
    predefinedType,
    storey,
    attributes,
    psets,
  };
}

function calculateCoverage(instances: IfcEntity[]): PsetCoverage[] {
  const total = instances.length;
  if (total === 0) return [];

  const psetMap = new Map<string, { count: number; propCounts: Map<string, { total: number; nonNull: number }> }>();

  for (const inst of instances) {
    for (const pset of inst.psets) {
      if (!psetMap.has(pset.name)) {
        psetMap.set(pset.name, { count: 0, propCounts: new Map() });
      }
      const entry = psetMap.get(pset.name)!;
      entry.count++;

      for (const prop of pset.properties) {
        if (!entry.propCounts.has(prop.name)) {
          entry.propCounts.set(prop.name, { total: 0, nonNull: 0 });
        }
        const pc = entry.propCounts.get(prop.name)!;
        pc.total++;
        if (prop.value != null) pc.nonNull++;
      }
    }
  }

  const result: PsetCoverage[] = [];
  for (const [psetName, data] of psetMap) {
    const coverage = data.count / total;
    const propertyCoverage: Record<string, number> = {};
    for (const [propName, pc] of data.propCounts) {
      propertyCoverage[propName] = pc.total > 0 ? pc.nonNull / pc.total : 0;
    }
    result.push({ psetName, coverage, propertyCoverage });
  }

  return result.sort((a, b) => b.coverage - a.coverage);
}

async function handleLoad(buffer: ArrayBuffer) {
  try {
    postMsg({ type: 'progress', percent: 5, phase: 'Initialisation du parseur WASM...' });

    await initApi();

    postMsg({ type: 'progress', percent: 15, phase: 'Chargement du fichier IFC...' });

    const data = new Uint8Array(buffer);
    modelId = api.OpenModel(data, {
      COORDINATE_TO_ORIGIN: false,
    });

    postMsg({ type: 'progress', percent: 30, phase: 'Lecture du schéma IFC...' });

    // Get IFC version from header
    let ifcVersion = 'UNKNOWN';
    try {
      const schema = api.GetModelSchema(modelId);
      if (schema) ifcVersion = schema;
    } catch {
      ifcVersion = 'IFC2X3';
    }

    postMsg({ type: 'progress', percent: 40, phase: "Inventaire des types d'entités..." });

    // Get all types in model - returns IfcType[] (plain array)
    const allTypes: WebIFC.IfcType[] = api.GetAllTypesOfModel(modelId);
    const typeSummaries: EntityTypeSummary[] = [];
    const totalTypes = allTypes.length;

    for (let i = 0; i < totalTypes; i++) {
      const ifcType = allTypes[i];
      const typeCode = ifcType.typeID;
      const typeName = ifcType.typeName;

      const ids = api.GetLineIDsWithType(modelId, typeCode);
      const count = ids.size();
      if (count === 0) continue;

      // Convert IFCWALL → IfcWall
      const displayName = toIfcCase(typeName);

      typeSummaries.push({
        type: displayName,
        count,
        storeyBreakdown: {},
      });

      if (i % 20 === 0) {
        const pct = 40 + Math.round((i / totalTypes) * 40);
        postMsg({ type: 'progress', percent: pct, phase: `Analyse des types... (${i}/${totalTypes})` });
      }
    }

    // Sort by count descending
    typeSummaries.sort((a, b) => b.count - a.count);

    postMsg({ type: 'progress', percent: 90, phase: 'Finalisation...' });

    // Clear caches for new file
    storeyCache.clear();
    psetCache.clear();
    coverageCache.clear();

    postMsg({ type: 'progress', percent: 100, phase: 'Prêt !' });
    postMsg({ type: 'ready', entityTypes: typeSummaries, ifcVersion });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    postMsg({ type: 'error', message: `Erreur de chargement: ${msg}` });
  }
}

function toIfcCase(name: string): string {
  // Convert IFCWALL → IfcWall
  if (!name.startsWith('IFC')) return name;
  const lower = name.toLowerCase();
  return 'Ifc' + lower.slice(3).charAt(0).toUpperCase() + lower.slice(4);
}

async function handleSelect(entityType: string) {
  try {
    postMsg({ type: 'progress', percent: 10, phase: `Chargement des instances de ${entityType}...` });

    // Find the type code for this entity type
    const allTypes: WebIFC.IfcType[] = api.GetAllTypesOfModel(modelId);
    let typeCode = -1;
    const upperType = entityType.toUpperCase();

    for (const ifcType of allTypes) {
      if (ifcType.typeName === upperType) {
        typeCode = ifcType.typeID;
        break;
      }
    }

    if (typeCode === -1) {
      postMsg({ type: 'instances', instances: [], psetCoverage: [] });
      return;
    }

    const ids = api.GetLineIDsWithType(modelId, typeCode);
    const count = ids.size();
    const instances: IfcEntity[] = [];

    for (let i = 0; i < count; i++) {
      const expressId = ids.get(i);
      const entity = extractEntity(expressId, entityType);
      instances.push(entity);

      if (i % 50 === 0) {
        const pct = 10 + Math.round((i / count) * 80);
        postMsg({ type: 'progress', percent: pct, phase: `Extraction des instances... (${i + 1}/${count})` });
      }
    }

    postMsg({ type: 'progress', percent: 95, phase: 'Calcul de la couverture des PSets...' });

    // Calculate pset coverage
    let coverage: PsetCoverage[];
    if (coverageCache.has(entityType)) {
      coverage = coverageCache.get(entityType)!;
    } else {
      coverage = calculateCoverage(instances);
      coverageCache.set(entityType, coverage);
    }

    postMsg({ type: 'instances', instances, psetCoverage: coverage });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    postMsg({ type: 'error', message: `Erreur de sélection: ${msg}` });
  }
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === 'load') {
    await handleLoad(msg.buffer);
  } else if (msg.type === 'select') {
    await handleSelect(msg.entityType);
  }
};
