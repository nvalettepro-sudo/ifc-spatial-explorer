import { create } from 'zustand'
import type {
  EntityTypeSummary,
  IfcEntity,
  PsetCoverage,
  WorkerOutMessage,
} from '../lib/types'

interface AppState {
  fileName: string | null
  ifcVersion: string | null
  isLoading: boolean
  loadProgress: number
  loadPhase: string
  error: string | null
  entityTypes: EntityTypeSummary[]
  selectedType: string | null
  instances: IfcEntity[]
  selectedInstance: IfcEntity | null
  psetCoverage: PsetCoverage[]
  searchQuery: string

  loadFile: (file: File) => void
  selectType: (type: string) => void
  selectInstance: (instance: IfcEntity) => void
  setSearchQuery: (q: string) => void
  clearError: () => void
}

let worker: Worker | null = null

function getOrCreateWorker(set: (s: Partial<AppState>) => void) {
  if (worker) {
    worker.terminate()
    worker = null
  }
  worker = new Worker(new URL('../workers/ifc.worker.ts', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
    const msg = e.data
    if (msg.type === 'progress') {
      set({ loadProgress: msg.percent, loadPhase: msg.phase, isLoading: true })
    } else if (msg.type === 'ready') {
      set({
        entityTypes: msg.entityTypes,
        ifcVersion: msg.ifcVersion,
        isLoading: false,
        loadProgress: 100,
        loadPhase: '',
        selectedType: null,
        instances: [],
        selectedInstance: null,
        psetCoverage: [],
      })
    } else if (msg.type === 'instances') {
      set({
        instances: msg.instances,
        psetCoverage: msg.psetCoverage,
        selectedInstance: null,
        isLoading: false,
        loadProgress: 100,
        loadPhase: '',
      })
    } else if (msg.type === 'error') {
      set({ error: msg.message, isLoading: false })
    }
  }
  worker.onerror = (e) => {
    set({ error: e.message, isLoading: false })
  }
  return worker
}

export const useStore = create<AppState>((set, _get) => ({
  fileName: null,
  ifcVersion: null,
  isLoading: false,
  loadProgress: 0,
  loadPhase: '',
  error: null,
  entityTypes: [],
  selectedType: null,
  instances: [],
  selectedInstance: null,
  psetCoverage: [],
  searchQuery: '',

  loadFile: (file: File) => {
    set({
      fileName: file.name,
      isLoading: true,
      loadProgress: 0,
      loadPhase: 'Lecture du fichier…',
      error: null,
      entityTypes: [],
      instances: [],
      selectedInstance: null,
      selectedType: null,
      psetCoverage: [],
    })
    const w = getOrCreateWorker(set)
    file.arrayBuffer().then((buf) => {
      w.postMessage({ type: 'load', buffer: buf }, [buf])
    })
  },

  selectType: (type: string) => {
    if (!worker) return
    set({
      selectedType: type,
      isLoading: true,
      loadProgress: 0,
      loadPhase: `Chargement des ${type}…`,
      instances: [],
      selectedInstance: null,
      psetCoverage: [],
    })
    worker.postMessage({ type: 'select', entityType: type })
  },

  selectInstance: (instance: IfcEntity) => {
    set({ selectedInstance: instance })
  },

  setSearchQuery: (q: string) => {
    set({ searchQuery: q })
  },

  clearError: () => set({ error: null }),
}))
