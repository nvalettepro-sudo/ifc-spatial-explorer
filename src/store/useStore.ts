import { create } from 'zustand';
import type { AppState, IfcEntity, WorkerOutMessage } from '../lib/types';
import IfcWorker from '../workers/ifc.worker?worker';

let worker: Worker | null = null;

function getOrCreateWorker(): Worker {
  if (!worker) {
    worker = new IfcWorker();
  }
  return worker;
}

export const useStore = create<AppState>((set, get) => ({
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
  psetCoverage: {},
  searchQuery: '',

  loadFile: (file: File) => {
    set({
      isLoading: true,
      loadProgress: 0,
      loadPhase: 'Démarrage...',
      error: null,
      fileName: file.name,
      entityTypes: [],
      selectedType: null,
      instances: [],
      selectedInstance: null,
      psetCoverage: {},
    });

    const w = getOrCreateWorker();

    w.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'progress':
          set({ loadProgress: msg.percent, loadPhase: msg.phase });
          break;

        case 'ready':
          set({
            isLoading: false,
            loadProgress: 100,
            ifcVersion: msg.ifcVersion,
            entityTypes: msg.entityTypes,
          });
          break;

        case 'instances':
          set((state) => ({
            isLoading: false,
            instances: msg.instances,
            psetCoverage: {
              ...state.psetCoverage,
              [state.selectedType ?? '']: msg.psetCoverage,
            },
          }));
          break;

        case 'error':
          set({ isLoading: false, error: msg.message });
          break;
      }
    };

    w.onerror = (e) => {
      set({ isLoading: false, error: `Erreur worker: ${e.message}` });
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      w.postMessage({ type: 'load', buffer }, [buffer]);
    };
    reader.readAsArrayBuffer(file);
  },

  selectType: (type: string) => {
    const state = get();
    if (state.selectedType === type) return;

    set({
      selectedType: type,
      instances: [],
      selectedInstance: null,
      isLoading: true,
      loadProgress: 0,
      loadPhase: `Chargement de ${type}...`,
    });

    const w = getOrCreateWorker();
    w.postMessage({ type: 'select', entityType: type });
  },

  selectInstance: (instance: IfcEntity) => {
    set({ selectedInstance: instance });
  },

  setSearchQuery: (q: string) => {
    set({ searchQuery: q });
  },
}));
