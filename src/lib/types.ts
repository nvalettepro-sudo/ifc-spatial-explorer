export interface IfcEntity {
  expressId: number;
  type: string;        // "IfcWall"
  name: string | null;
  globalId: string | null;
  predefinedType: string | null;
  storey: string | null;  // resolved via spatial hierarchy
  attributes: Record<string, string | number | boolean | null>;
  psets: PsetData[];
}

export interface PsetData {
  name: string;          // "Pset_WallCommon"
  isStandard: boolean;   // starts with "Pset_" buildingSMART convention
  properties: PropertyEntry[];
}

export interface PropertyEntry {
  name: string;
  value: string | number | boolean | null;
  unit?: string;
}

export interface EntityTypeSummary {
  type: string;
  count: number;
  storeyBreakdown: Record<string, number>;
}

export interface PsetCoverage {
  psetName: string;
  coverage: number;        // 0–1, ratio of instances that HAVE this pset
  propertyCoverage: Record<string, number>;  // prop name → fill rate (non-null / count with pset)
}

export interface AppState {
  fileName: string | null;
  ifcVersion: string | null;   // "IFC2X3" | "IFC4" | "IFC4X3"
  isLoading: boolean;
  loadProgress: number;  // 0–100
  loadPhase: string;
  error: string | null;
  entityTypes: EntityTypeSummary[];
  selectedType: string | null;
  instances: IfcEntity[];       // all instances of selectedType
  selectedInstance: IfcEntity | null;
  psetCoverage: Record<string, PsetCoverage[]>;  // type → coverage array (memoized)
  searchQuery: string;
  // actions
  loadFile: (file: File) => void;
  selectType: (type: string) => void;
  selectInstance: (instance: IfcEntity) => void;
  setSearchQuery: (q: string) => void;
}

// Worker message types
export type WorkerInMessage =
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'select'; entityType: string };

export type WorkerOutMessage =
  | { type: 'progress'; percent: number; phase: string }
  | { type: 'ready'; entityTypes: EntityTypeSummary[]; ifcVersion: string }
  | { type: 'instances'; instances: IfcEntity[]; psetCoverage: PsetCoverage[] }
  | { type: 'error'; message: string };
