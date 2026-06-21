# Prompt de migration — IFC Properties Explorer

Crée une application React/TypeScript dans ce repo GitHub en créant tous les fichiers
ci-dessous. Ensuite, installe les dépendances, compile, et déploie sur GitHub Pages.

## Étapes à suivre

1. Créer tous les fichiers listés ci-dessous
2. Copier les fichiers WASM : `cp node_modules/web-ifc/web-ifc.wasm public/ && cp node_modules/web-ifc/web-ifc-mt.wasm public/`
3. Mettre à jour `vite.config.ts` : remplacer `NOM_DU_REPO` par le vrai nom du repo GitHub
4. Compiler : `npm install && npm run build`
5. Déployer sur GitHub Pages : copier `dist/` en `explorer/` sur la branche `main` et pousser

---

## `package.json`

```json
{
  "name": "ifc-data-explorer",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "npm run build && electron .",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  },
  "dependencies": {
    "@tanstack/react-table": "^8.20.5",
    "@tanstack/react-virtual": "^3.10.9",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "web-ifc": "^0.0.57",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  },
  "build": {
    "appId": "com.nvalette.ifc-data-explorer",
    "productName": "IFC Data Explorer",
    "copyright": "Nico Valette — BIM Manager",
    "directories": { "output": "release" },
    "files": ["dist/**", "electron/**", "package.json"],
    "asarUnpack": ["dist/web-ifc.wasm", "dist/web-ifc-mt.wasm"],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }],
      "icon": "public/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": [{ "target": "AppImage", "arch": ["x64"] }],
      "icon": "public/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerLanguages": ["fr_FR", "en_US"],
      "language": "1036"
    }
  }
}
```

---

## `vite.config.ts`

⚠️ Remplacer `NOM_DU_REPO` par le vrai nom du repo GitHub (ex: `Ifc-Properties-Explorer`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/NOM_DU_REPO/explorer/',
  plugins: [react()],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['web-ifc']
  }
})
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

---

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    }
  },
  plugins: []
}
```

---

## `postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

---

## `index.html`

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IFC Data Explorer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## `.gitignore`

```
node_modules/
dist/
.DS_Store
*.local
.claude/
```

---

## `electron/main.cjs`

```js
// Electron main process
const { app, BrowserWindow, protocol, net, shell } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

const isDev = !app.isPackaged

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true,
    corsEnabled: true,
  }
}])

function getDistDir() {
  if (isDev) return path.join(__dirname, '..', 'dist')
  return path.join(app.getAppPath(), 'dist')
}

function resolveFilePath(distDir, pathname) {
  if (app.isPackaged && (pathname.endsWith('.wasm'))) {
    const unpackedBase = app.getAppPath().replace('app.asar', 'app.asar.unpacked')
    return path.join(unpackedBase, 'dist', pathname)
  }
  return path.join(distDir, pathname)
}

app.whenReady().then(() => {
  const distDir = getDistDir()

  protocol.handle('app', async (request) => {
    const url = new URL(request.url)
    let pathname = url.pathname
    if (pathname === '/' || pathname === '') pathname = '/index.html'

    const filePath = resolveFilePath(distDir, pathname)

    try {
      const response = await net.fetch(pathToFileURL(filePath).toString())
      if (pathname.endsWith('.wasm')) {
        const headers = new Headers(response.headers)
        headers.set('Content-Type', 'application/wasm')
        return new Response(response.body, { status: response.status, headers })
      }
      return response
    } catch {
      const indexPath = path.join(distDir, 'index.html')
      return net.fetch(pathToFileURL(indexPath).toString())
    }
  })

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'IFC Data Explorer',
    backgroundColor: '#030712',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.loadURL('app:///index.html')

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) win.webContents.openDevTools()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) app.whenReady().then(() => {})
})
```

---

## `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: #374151 transparent;
  }

  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  *::-webkit-scrollbar-thumb {
    background-color: #374151;
    border-radius: 0;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #030712;
    color: #f9fafb;
  }
}
```

---

## `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />

declare module '*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
```

---

## `src/lib/types.ts`

```typescript
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

export interface TextValueCount {
  value: string
  count: number
}

export interface ValueAggregate {
  kind: 'text' | 'numeric' | 'empty'
  distinctValues?: TextValueCount[]
  min?: number
  max?: number
  presentCount: number
  totalCount: number
}

export interface AggregatedProperty {
  name: string
  aggregate: ValueAggregate
}

export interface AggregatedPset {
  name: string
  isStandard: boolean
  presentCount: number
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

export type WorkerInMessage =
  | { type: 'init'; wasmPath: string }
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'select'; entityType: string }

export type WorkerOutMessage =
  | { type: 'progress'; percent: number; phase: string }
  | { type: 'ready'; entityTypes: EntityTypeSummary[]; ifcVersion: string }
  | { type: 'aggregated'; data: AggregatedEntityData }
  | { type: 'error'; message: string }
```

---

## `src/lib/ifcTranslations.ts`

```typescript
// IFC entity → French translation (source: Solibri component mapping)
// Only entities listed here are displayed in the left panel.
export const IFC_FR: Record<string, string> = {
  IfcActuator: 'Actionneur',
  IfcActuatorType: 'Actionneur',
  IfcAirTerminal: 'Terminaison Air',
  IfcAirTerminalBox: 'Bornier air',
  IfcAirTerminalBoxType: 'Bornier air',
  IfcAirTerminalType: 'Terminaison Air',
  IfcAirToAirHeatRecovery: 'Récupération de Chaleur Air-Air',
  IfcAirToAirHeatRecoveryType: 'Récupération de Chaleur Air-Air',
  IfcAlarm: 'Alarme',
  IfcAlarmType: 'Alarme',
  IfcAsset: 'Groupe',
  IfcAudioVisualAppliance: 'Appareil Audiovisuel',
  IfcAudioVisualApplianceType: 'Appareil Audiovisuel',
  IfcBeam: 'Poutre',
  IfcBeamStandardCase: 'Poutre',
  IfcBeamType: 'Poutre',
  IfcBearing: 'Palier',
  IfcBearingType: 'Palier',
  IfcBoiler: 'Chaudière',
  IfcBoilerType: 'Chaudière',
  IfcBorehole: 'Forage',
  IfcBridge: 'Pont',
  IfcBridgePart: 'Partie de Pont',
  IfcBuilding: 'Bâtiment',
  IfcBuildingElement: 'Élément',
  IfcBuildingElementComponent: 'Objet',
  IfcBuildingElementPart: 'Pièce Élément Bâtiment',
  IfcBuildingElementPartType: 'Pièce Élément Bâtiment',
  IfcBuildingElementProxy: 'Objet',
  IfcBuildingElementProxyType: 'Pièce Élément Bâtiment',
  IfcBuildingElementType: 'Pièce Élément Bâtiment',
  IfcBuildingStorey: 'Étage',
  IfcBuildingSystem: 'Système',
  IfcBuiltElement: 'Élément',
  IfcBuiltElementType: 'Élément',
  IfcBuiltSystem: 'Système',
  IfcBurner: 'Brûleur',
  IfcBurnerType: 'Brûleur',
  IfcCableCarrierFitting: 'Raccord Chemin de câble',
  IfcCableCarrierFittingType: 'Raccord Chemin de câble',
  IfcCableCarrierSegment: 'Chemin de câble',
  IfcCableCarrierSegmentType: 'Chemin de câble',
  IfcCableFitting: 'Raccord de câble',
  IfcCableFittingType: 'Raccord de câble',
  IfcCableSegment: 'Câble',
  IfcCaissonFoundation: 'Fondation Caisson',
  IfcCaissonFoundationType: 'Fondation Caisson',
  IfcChamferEdgeFeature: 'Objet',
  IfcChiller: 'Groupe Frigorifique',
  IfcChillerType: 'Groupe Frigorifique',
  IfcChimney: 'Cheminée',
  IfcChimneyType: 'Cheminée',
  IfcCivilElement: 'Élément de Génie Civil',
  IfcCivilElementType: 'Élément de Génie Civil',
  IfcCoil: 'Serpentin',
  IfcCoilType: 'Serpentin',
  IfcColumn: 'Poteau',
  IfcColumnStandardCase: 'Poteau',
  IfcColumnType: 'Poteau',
  IfcCommunicationsAppliance: 'Appareil de Communication',
  IfcCommunicationsApplianceType: 'Appareil de Communication',
  IfcCompressor: 'Compresseur',
  IfcCompressorType: 'Compresseur',
  IfcCondenser: 'Condensateur',
  IfcCondenserType: 'Condensateur',
  IfcController: 'Manette',
  IfcControllerType: 'Manette',
  IfcConveyorSegment: 'Segment de Convoyeur',
  IfcConveyorSegmentType: 'Segment de Convoyeur',
  IfcCooledBeam: 'Poutre réfrigérée',
  IfcCooledBeamType: 'Poutre réfrigérée',
  IfcCoolingTower: 'Tour de Réfrigération',
  IfcCoolingTowerType: 'Tour de Réfrigération',
  IfcCourse: 'Cours',
  IfcCourseType: 'Cours',
  IfcCovering: 'Revêtement',
  IfcCoveringType: 'Revêtement',
  IfcCurtainWall: 'Mur rideau',
  IfcCurtainWallType: 'Mur rideau',
  IfcDamper: 'Régulateur',
  IfcDamperType: 'Régulateur',
  IfcDeepFoundation: 'Fondation Profonde',
  IfcDeepFoundationType: 'Fondation Profonde',
  IfcDiscreteAccessory: 'Composant auxiliaire',
  IfcDiscreteAccessoryType: 'Composant auxiliaire',
  IfcDistributionBoard: 'Tableau de Distribution',
  IfcDistributionBoardType: 'Tableau de Distribution',
  IfcDistributionChamberElement: 'Élément Chambre de Distribution',
  IfcDistributionChamberElementType: 'Élément Chambre de Distribution',
  IfcDistributionCircuit: 'Circuit de Distribution',
  IfcDistributionControlElement: 'Élément de Contrôle de Distribution',
  IfcDistributionControlElementType: 'Élément de Contrôle de Distribution',
  IfcDistributionElement: 'Élément de distribution',
  IfcDistributionElementType: 'Élément de distribution',
  IfcDistributionFlowElement: 'Élément Flux de Distribution',
  IfcDistributionFlowElementType: 'Élément Flux de Distribution',
  IfcDistributionPort: 'Port de Distribution',
  IfcDistributionSystem: 'Système de Distribution',
  IfcDoor: 'Porte',
  IfcDoorStandardCase: 'Porte',
  IfcDoorStyle: 'Porte',
  IfcDoorType: 'Porte',
  IfcDuctFitting: 'Raccord Conduit',
  IfcDuctFittingType: 'Raccord Conduit',
  IfcDuctSegment: 'Conduit',
  IfcDuctSegmentType: 'Conduit',
  IfcDuctSilencer: 'Silencieux Conduit',
  IfcDuctSilencerType: 'Silencieux Conduit',
  IfcEarthworksCut: 'Coupe de Terrassement',
  IfcEarthworksElement: 'Élément de Terrassement',
  IfcEarthworksFill: 'Remplissage de Terrassement',
  IfcEdgeFeature: 'Objet',
  IfcElectricAppliance: 'Appareil électrique',
  IfcElectricApplianceType: 'Appareil électrique',
  IfcElectricDistributionBoard: 'Tableau de Distribution Électrique',
  IfcElectricDistributionBoardType: 'Tableau de Distribution Électrique',
  IfcElectricDistributionPoint: 'Point de Distribution électrique',
  IfcElectricFlowStorageDevice: "Appareil de Stockage d'Électricité",
  IfcElectricFlowStorageDeviceType: "Appareil de Stockage d'Électricité",
  IfcElectricFlowTreatmentDevice: 'Dispositif de Traitement de Flux Électrique',
  IfcElectricFlowTreatmentDeviceType: 'Dispositif de Traitement de Flux Électrique',
  IfcElectricGenerator: 'Générateur électrique',
  IfcElectricGeneratorType: 'Générateur électrique',
  IfcElectricMotor: 'Moteur électrique',
  IfcElectricMotorType: 'Moteur électrique',
  IfcElectricTimeControl: 'Minuterie électrique',
  IfcElectricTimeControlType: 'Minuterie électrique',
  IfcElectricalElement: 'Élément de distribution',
  IfcElement: 'Élément',
  IfcElementAssembly: 'Assemblage',
  IfcElementAssemblyType: 'Assemblage',
  IfcElementComponent: 'Élément',
  IfcElementComponentType: 'Élément',
  IfcElementType: 'Élément',
  IfcEnergyConversionDevice: "Convertisseur d'énergie",
  IfcEnergyConversionDeviceType: "Convertisseur d'énergie",
  IfcEngine: 'Moteur',
  IfcEngineType: 'Moteur',
  IfcEquipmentElement: 'Objet',
  IfcEvaporativeCooler: 'Refroidisseur à Evaporation',
  IfcEvaporativeCoolerType: 'Refroidisseur à Evaporation',
  IfcEvaporator: 'Evaporateur',
  IfcEvaporatorType: 'Evaporateur',
  IfcExternalSpatialElement: 'Élément Spatial Externe',
  IfcExternalSpatialStructureElement: 'Élément Spatial Externe',
  IfcFacility: 'Installation',
  IfcFacilityPart: "Partie d'Installation",
  IfcFacilityPartCommon: "Partie d'Installation",
  IfcFan: 'Ventilateur',
  IfcFanType: 'Ventilateur',
  IfcFastener: 'Fixation',
  IfcFastenerType: 'Fixation',
  IfcFeatureElement: 'Élément de Fonctionnalité',
  IfcFeatureElementAddition: "Ajout d'Élément de Fonctionnalité",
  IfcFeatureElementSubtraction: 'Ouverture',
  IfcFilter: 'Filtre',
  IfcFilterType: 'Filtre',
  IfcFireSuppressionTerminal: 'Terminal extinction incendie',
  IfcFireSuppressionTerminalType: 'Terminal extinction incendie',
  IfcFlowController: 'Contrôleur de Flux',
  IfcFlowControllerType: 'Contrôleur de Flux',
  IfcFlowFitting: 'Raccords Flux',
  IfcFlowFittingType: 'Raccords Flux',
  IfcFlowInstrument: 'Instrument de Débit',
  IfcFlowInstrumentType: 'Instrument de Débit',
  IfcFlowMeter: 'Débitmètre',
  IfcFlowMeterType: 'Débitmètre',
  IfcFlowMovingDevice: 'Appareil Déplacement de Flux',
  IfcFlowMovingDeviceType: 'Appareil Déplacement de Flux',
  IfcFlowSegment: 'Segment de flux',
  IfcFlowSegmentType: 'Segment de flux',
  IfcFlowStorageDevice: 'Appareil de Stockage de Flux',
  IfcFlowStorageDeviceType: 'Appareil de Stockage de Flux',
  IfcFlowTerminal: 'Terminaison Flux',
  IfcFlowTerminalType: 'Terminaison Flux',
  IfcFlowTreatmentDevice: 'Appareil de Traitement de Flux',
  IfcFlowTreatmentDeviceType: 'Appareil de Traitement de Flux',
  IfcFooting: 'Fondation',
  IfcFootingType: 'Fondation',
  IfcFurnishingElement: 'Mobilier',
  IfcFurnishingElementType: 'Mobilier',
  IfcFurniture: 'Mobilier',
  IfcFurnitureType: 'Mobilier',
  IfcGeographicElement: 'Élément Géographique',
  IfcGeographicElementType: 'Élément Géographique',
  IfcGeomodel: 'Géomodèle',
  IfcGeoslice: 'Géotranche',
  IfcGeotechnicalAssembly: 'Assemblage Géotechnique',
  IfcGeotechnicalElement: 'Élément Géotechnique',
  IfcGeotechnicalStratum: 'Strate Géotechnique',
  IfcGroup: 'Groupe',
  IfcHeatExchanger: "Echangeur d'Air",
  IfcHeatExchangerType: "Echangeur d'Air",
  IfcHumidifier: 'Humidificateur',
  IfcHumidifierType: 'Humidificateur',
  IfcImpactProtectionDevice: 'Dispositif de protection contre les Chocs',
  IfcImpactProtectionDeviceType: 'Dispositif de protection contre les Chocs',
  IfcInterceptor: 'Intercepteur',
  IfcInterceptorType: 'Intercepteur',
  IfcInventory: 'Groupe',
  IfcJunctionBox: 'Boite de jonction',
  IfcJunctionBoxType: 'Boite de jonction',
  IfcKerb: 'Trottoir',
  IfcKerbType: 'Trottoir',
  IfcLamp: 'Ampoule',
  IfcLampType: 'Ampoule',
  IfcLightFixture: 'Luminaire',
  IfcLightFixtureType: 'Luminaire',
  IfcLiquidTerminal: 'Terminal Liquide',
  IfcLiquidTerminalType: 'Terminal Liquide',
  IfcMarineFacility: 'Installation Maritime',
  IfcMarinePart: 'Partie Marine',
  IfcMechanicalFastener: 'Attache Mécanique',
  IfcMechanicalFastenerType: 'Attache Mécanique',
  IfcMedicalDevice: 'Dispositif Médical',
  IfcMedicalDeviceType: 'Dispositif Médical',
  IfcMember: 'Membre',
  IfcMemberStandardCase: 'Membre',
  IfcMemberType: 'Membre',
  IfcMobileTelecommunicationsAppliance: 'Appareil de Télécommunications Mobiles',
  IfcMobileTelecommunicationsApplianceType: 'Appareil de Télécommunications Mobiles',
  IfcMooringDevice: "Dispositif d'Amarrage",
  IfcMooringDeviceType: "Dispositif d'Amarrage",
  IfcMotorConnection: 'Connexion moteur',
  IfcMotorConnectionType: 'Connexion moteur',
  IfcNavigationElement: 'Élément de Navigation',
  IfcNavigationElementType: 'Élément de Navigation',
  IfcOpeningElement: 'Ouverture',
  IfcOpeningStandardCase: 'Ouverture',
  IfcOutlet: 'Sortie',
  IfcOutletType: 'Sortie',
  IfcPavement: 'Chaussée',
  IfcPavementType: 'Chaussée',
  IfcPile: 'Pieu',
  IfcPileType: 'Pieu',
  IfcPipeFitting: 'Raccord Tuyau',
  IfcPipeFittingType: 'Raccord Tuyau',
  IfcPipeSegment: 'Tuyau',
  IfcPipeSegmentType: 'Tuyau',
  IfcPlate: 'Plaque',
  IfcPlateStandardCase: 'Plaque',
  IfcPlateType: 'Plaque',
  IfcProject: 'Projet',
  IfcProjectionElement: 'Élément de Projection',
  IfcProtectiveDevice: 'Appareil de Protection',
  IfcProtectiveDeviceTrippingUnit: 'Unité de Déclenchement du Dispositif de Protection',
  IfcProtectiveDeviceTrippingUnitType: 'Unité de Déclenchement du Dispositif de Protection',
  IfcProtectiveDeviceType: 'Appareil de Protection',
  IfcProxy: 'Objet',
  IfcPump: 'Pompe',
  IfcPumpType: 'Pompe',
  IfcRail: 'Rail',
  IfcRailType: 'Rail',
  IfcRailing: 'Garde-corps',
  IfcRailingType: 'Garde-corps',
  IfcRailway: 'Chemin de fer',
  IfcRailwayPart: 'Partie Ferroviaire',
  IfcRamp: 'Rampe',
  IfcRampFlight: 'Rampe',
  IfcRampFlightType: 'Rampe',
  IfcRampType: 'Rampe',
  IfcReinforcedSoil: 'Sol Renforcé',
  IfcReinforcingBar: "Barre d'armature",
  IfcReinforcingBarType: "Barre d'armature",
  IfcReinforcingElement: 'Élément de Renforcement',
  IfcReinforcingElementType: 'Élément de Renforcement',
  IfcReinforcingMesh: 'Treillis de renfort',
  IfcReinforcingMeshType: 'Treillis de renfort',
  IfcRoad: 'Route',
  IfcRoadPart: 'Partie de Route',
  IfcRoof: 'Toit',
  IfcRoofType: 'Toit',
  IfcRoundedEdgeFeature: 'Objet',
  IfcSanitaryTerminal: 'Terminal sanitaire',
  IfcSanitaryTerminalType: 'Terminal sanitaire',
  IfcSensor: 'Capteur',
  IfcSensorType: 'Capteur',
  IfcShadingDevice: "Dispositif d'Ombrage",
  IfcShadingDeviceType: "Dispositif d'Ombrage",
  IfcSign: 'Signe',
  IfcSignType: 'Signe',
  IfcSignal: 'Signal',
  IfcSignalType: 'Signal',
  IfcSite: 'Site',
  IfcSlab: 'Dalle',
  IfcSlabElementedCase: 'Dalle',
  IfcSlabStandardCase: 'Dalle',
  IfcSlabType: 'Dalle',
  IfcSolarDevice: 'Dispositif Solaire',
  IfcSolarDeviceType: 'Dispositif Solaire',
  IfcSpace: 'Espace',
  IfcSpaceHeater: 'Chauffage par Convection',
  IfcSpaceHeaterType: 'Chauffage par Convection',
  IfcSpaceType: 'Espace',
  IfcSpatialElement: 'Élément spatial',
  IfcSpatialElementType: 'Élément spatial',
  IfcSpatialStructureElement: 'Élément spatial',
  IfcSpatialStructureElementType: 'Élément spatial',
  IfcSpatialZone: 'Zone Spatiale',
  IfcSpatialZoneType: 'Zone Spatiale',
  IfcStackTerminal: 'Terminal cheminée',
  IfcStackTerminalType: 'Terminal cheminée',
  IfcStair: 'Escalier',
  IfcStairFlight: 'Escalier',
  IfcStairFlightType: 'Escalier',
  IfcStairType: 'Escalier',
  IfcStructuralAnalysisModel: 'Système',
  IfcStructuralLoadGroup: 'Groupe',
  IfcStructuralResultGroup: 'Groupe',
  IfcSurfaceFeature: 'Caractéristique de Surface',
  IfcSwitchingDevice: 'Disjoncteur',
  IfcSwitchingDeviceType: 'Disjoncteur',
  IfcSystem: 'Système',
  IfcSystemFurnitureElement: 'Élément de système de Mobilier',
  IfcSystemFurnitureElementType: 'Élément de système de Mobilier',
  IfcTank: 'Citerne',
  IfcTankType: 'Citerne',
  IfcTendon: 'Tendon',
  IfcTendonAnchor: 'Fixation tendon',
  IfcTendonAnchorType: 'Fixation tendon',
  IfcTendonConduit: 'Conduit pour Tendons',
  IfcTendonConduitType: 'Conduit pour Tendons',
  IfcTendonType: 'Tendon',
  IfcTrackElement: 'Élément de Piste',
  IfcTrackElementType: 'Élément de Piste',
  IfcTransformer: 'Transformateur',
  IfcTransformerType: 'Transformateur',
  IfcTransportElement: 'Élément transport',
  IfcTransportElementType: 'Élément transport',
  IfcTransportationDevice: 'Dispositif de Transport',
  IfcTransportationDeviceType: 'Dispositif de Transport',
  IfcTubeBundle: 'Faisceau de Tubes',
  IfcTubeBundleType: 'Faisceau de Tubes',
  IfcUnitaryControlElement: 'Élément de Contrôle Unitaire',
  IfcUnitaryControlElementType: 'Élément de Contrôle Unitaire',
  IfcUnitaryEquipment: 'Equipement Unitaire',
  IfcUnitaryEquipmentType: 'Equipement Unitaire',
  IfcValve: 'Vanne',
  IfcValveType: 'Vanne',
  IfcVehicle: 'Véhicule',
  IfcVehicleType: 'Véhicule',
  IfcVibrationDamper: 'Amortisseur de Vibrations',
  IfcVibrationDamperType: 'Amortisseur de Vibrations',
  IfcVibrationIsolator: 'Isolateur de Vibrations',
  IfcVibrationIsolatorType: 'Isolateur de Vibrations',
  IfcVirtualElement: 'Élément Virtuel',
  IfcVoidingFeature: 'Ouverture',
  IfcWall: 'Mur',
  IfcWallElementedCase: 'Mur',
  IfcWallStandardCase: 'Mur',
  IfcWallType: 'Mur',
  IfcWasteTerminal: 'Terminal déchets',
  IfcWasteTerminalType: 'Terminal déchets',
  IfcWindow: 'Fenêtre',
  IfcWindowStandardCase: 'Fenêtre',
  IfcWindowStyle: 'Fenêtre',
  IfcWindowType: 'Fenêtre',
  IfcZone: 'Zone',
}

export const ALLOWED_IFC_TYPES = new Set(Object.keys(IFC_FR))
```

---

## `src/store/useStore.ts`

```typescript
import { create } from 'zustand'
import type {
  EntityTypeSummary,
  AggregatedEntityData,
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
  aggregatedData: AggregatedEntityData | null
  searchQuery: string

  loadFile: (file: File) => void
  selectType: (type: string) => void
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
  worker.postMessage({ type: 'init', wasmPath: import.meta.env.BASE_URL })
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
        aggregatedData: null,
      })
    } else if (msg.type === 'aggregated') {
      set({
        aggregatedData: msg.data,
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
  aggregatedData: null,
  searchQuery: '',

  loadFile: (file: File) => {
    set({
      fileName: file.name,
      isLoading: true,
      loadProgress: 0,
      loadPhase: 'Lecture du fichier…',
      error: null,
      entityTypes: [],
      aggregatedData: null,
      selectedType: null,
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
      loadPhase: `Agrégation des ${type}…`,
      aggregatedData: null,
    })
    worker.postMessage({ type: 'select', entityType: type })
  },

  setSearchQuery: (q: string) => {
    set({ searchQuery: q })
  },

  clearError: () => set({ error: null }),
}))
```

---

## `src/workers/ifc.worker.ts`

```typescript
import * as WebIFC from 'web-ifc'
import type {
  EntityTypeSummary,
  PsetData,
  PropertyEntry,
  AggregatedEntityData,
  AggregatedProperty,
  AggregatedPset,
  ValueAggregate,
  TextValueCount,
  WorkerInMessage,
  WorkerOutMessage,
} from '../lib/types'

let api: WebIFC.IfcAPI | null = null
let modelId = -1
let ifcVersion = 'IFC2X3'
let wasmBasePath: string | null = null

const typeCodeMap = new Map<string, number>()
const entityPsetMap = new Map<number, PsetData[]>()
const storeyCache = new Map<number, string | null>()
const aggregationCache = new Map<string, AggregatedEntityData>()

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

  typeCodeMap.clear()
  entityPsetMap.clear()
  storeyCache.clear()
  aggregationCache.clear()

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

  post({ type: 'progress', percent: 60, phase: "Analyse des types d'entités…" })

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

const ATTR_KEYS = ['Name', 'ObjectType', 'Description', 'PredefinedType']

function buildTextAggregate(
  textMap: Map<string, number>,
  presentCount: number,
  totalCount: number
): ValueAggregate {
  const distinctValues: TextValueCount[] = Array.from(textMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
  return { kind: 'text', distinctValues, presentCount, totalCount }
}

function buildNumericAggregate(
  range: { min: number; max: number },
  presentCount: number,
  totalCount: number
): ValueAggregate {
  return { kind: 'numeric', min: range.min, max: range.max, presentCount, totalCount }
}

async function selectEntityType(entityType: string) {
  if (!api || modelId < 0) return

  if (aggregationCache.has(entityType)) {
    post({ type: 'progress', percent: 100, phase: 'Terminé' })
    post({ type: 'aggregated', data: aggregationCache.get(entityType)! })
    return
  }

  post({ type: 'progress', percent: 10, phase: `Chargement des ${entityType}…` })

  const typeCode = typeCodeMap.get(entityType)
  if (typeCode === undefined) {
    post({ type: 'error', message: `Type inconnu: ${entityType}` })
    return
  }

  const lineIds = api.GetLineIDsWithType(modelId, typeCode)
  const total = lineIds.size()

  const attrTextMap = new Map<string, Map<string, number>>()
  const attrNumMap = new Map<string, { min: number; max: number }>()
  const attrPresentCount = new Map<string, number>()

  const psetPresentCount = new Map<string, number>()
  const psetIsStandard = new Map<string, boolean>()
  const psetPropTextMap = new Map<string, Map<string, Map<string, number>>>()
  const psetPropNumMap = new Map<string, Map<string, { min: number; max: number }>>()
  const psetPropPresentCount = new Map<string, Map<string, number>>()

  for (let i = 0; i < total; i++) {
    const expressId = lineIds.get(i)

    let line: Record<string, unknown>
    try {
      line = api.GetLine(modelId, expressId, false) as Record<string, unknown>
    } catch { continue }

    for (const attr of ATTR_KEYS) {
      const rawVal = line[attr]
      if (rawVal === null || rawVal === undefined) continue
      const val = valueToString(rawVal)
      if (val === null) continue

      attrPresentCount.set(attr, (attrPresentCount.get(attr) ?? 0) + 1)

      if (typeof val === 'number') {
        if (!attrNumMap.has(attr)) {
          attrNumMap.set(attr, { min: val, max: val })
        } else {
          const r = attrNumMap.get(attr)!
          if (val < r.min) r.min = val
          if (val > r.max) r.max = val
        }
      } else {
        const strVal = String(val)
        if (!attrTextMap.has(attr)) attrTextMap.set(attr, new Map())
        const m = attrTextMap.get(attr)!
        m.set(strVal, (m.get(strVal) ?? 0) + 1)
      }
    }

    const psets = entityPsetMap.get(expressId) ?? []
    for (const pset of psets) {
      psetPresentCount.set(pset.name, (psetPresentCount.get(pset.name) ?? 0) + 1)
      psetIsStandard.set(pset.name, pset.isStandard)

      if (!psetPropTextMap.has(pset.name)) psetPropTextMap.set(pset.name, new Map())
      if (!psetPropNumMap.has(pset.name)) psetPropNumMap.set(pset.name, new Map())
      if (!psetPropPresentCount.has(pset.name)) psetPropPresentCount.set(pset.name, new Map())

      const propTextMap = psetPropTextMap.get(pset.name)!
      const propNumMap = psetPropNumMap.get(pset.name)!
      const propCountMap = psetPropPresentCount.get(pset.name)!

      for (const prop of pset.properties) {
        if (prop.value === null || prop.value === '') continue

        propCountMap.set(prop.name, (propCountMap.get(prop.name) ?? 0) + 1)

        if (typeof prop.value === 'number') {
          const v = prop.value
          if (!propNumMap.has(prop.name)) {
            propNumMap.set(prop.name, { min: v, max: v })
          } else {
            const r = propNumMap.get(prop.name)!
            if (v < r.min) r.min = v
            if (v > r.max) r.max = v
          }
        } else {
          const strVal = String(prop.value)
          if (!propTextMap.has(prop.name)) propTextMap.set(prop.name, new Map())
          const m = propTextMap.get(prop.name)!
          m.set(strVal, (m.get(strVal) ?? 0) + 1)
        }
      }
    }

    if (i % 200 === 0) {
      const pct = 10 + Math.round((i / total) * 85)
      post({ type: 'progress', percent: pct, phase: `${i + 1}/${total} ${entityType}…` })
    }
  }

  const attributes: AggregatedProperty[] = []
  for (const attr of ATTR_KEYS) {
    const presentCount = attrPresentCount.get(attr) ?? 0
    if (presentCount === 0) continue

    let aggregate: ValueAggregate
    if (attrNumMap.has(attr)) {
      aggregate = buildNumericAggregate(attrNumMap.get(attr)!, presentCount, total)
    } else if (attrTextMap.has(attr)) {
      aggregate = buildTextAggregate(attrTextMap.get(attr)!, presentCount, total)
    } else {
      aggregate = { kind: 'empty', presentCount, totalCount: total }
    }
    attributes.push({ name: attr, aggregate })
  }

  const standardPsets: AggregatedPset[] = []
  const customPsets: AggregatedPset[] = []

  for (const [psetName, presentCount] of psetPresentCount.entries()) {
    const isStandard = psetIsStandard.get(psetName) ?? false
    const propTextMap = psetPropTextMap.get(psetName) ?? new Map()
    const propNumMap = psetPropNumMap.get(psetName) ?? new Map()
    const propCountMap = psetPropPresentCount.get(psetName) ?? new Map()

    const allPropNames = new Set([...propTextMap.keys(), ...propNumMap.keys(), ...propCountMap.keys()])
    const properties: AggregatedProperty[] = []

    for (const propName of allPropNames) {
      const propPresent = propCountMap.get(propName) ?? 0
      let aggregate: ValueAggregate

      if (propNumMap.has(propName)) {
        aggregate = buildNumericAggregate(propNumMap.get(propName)!, propPresent, total)
      } else if (propTextMap.has(propName)) {
        aggregate = buildTextAggregate(propTextMap.get(propName)!, propPresent, total)
      } else {
        aggregate = { kind: 'empty', presentCount: propPresent, totalCount: total }
      }
      properties.push({ name: propName, aggregate })
    }

    properties.sort((a, b) => a.name.localeCompare(b.name))

    const aggPset: AggregatedPset = { name: psetName, isStandard, presentCount, totalCount: total, properties }

    if (isStandard) standardPsets.push(aggPset)
    else customPsets.push(aggPset)
  }

  standardPsets.sort((a, b) => b.presentCount - a.presentCount)
  customPsets.sort((a, b) => b.presentCount - a.presentCount)

  const data: AggregatedEntityData = {
    entityType,
    totalCount: total,
    attributes,
    standardPsets,
    customPsets,
  }

  aggregationCache.set(entityType, data)

  post({ type: 'progress', percent: 100, phase: 'Terminé' })
  post({ type: 'aggregated', data })
}

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
```

---

## `src/App.tsx`

```tsx
import { useStore } from './store/useStore'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { InfoPanel } from './components/InfoPanel'
import { FileDropZone } from './components/FileDropZone'

export function App() {
  const fileName = useStore((s) => s.fileName)
  const error = useStore((s) => s.error)
  const clearError = useStore((s) => s.clearError)
  const isLoading = useStore((s) => s.isLoading)

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {!fileName && !isLoading && <FileDropZone />}

      <TopBar />

      <div className="flex flex-1 min-h-0">
        <div className="w-56 flex-shrink-0 min-h-0">
          <LeftPanel />
        </div>
        <InfoPanel />
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-red-950 border border-red-800 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-sm flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-300 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## `src/components/TopBar.tsx`

```tsx
import { useStore } from '../store/useStore'

const VERSION_COLORS: Record<string, string> = {
  IFC2X3: 'bg-indigo-800 text-indigo-200',
  IFC4: 'bg-blue-800 text-blue-200',
  IFC4X3: 'bg-cyan-800 text-cyan-200',
}

export function TopBar() {
  const fileName = useStore((s) => s.fileName)
  const ifcVersion = useStore((s) => s.ifcVersion)
  const isLoading = useStore((s) => s.isLoading)
  const loadProgress = useStore((s) => s.loadProgress)
  const loadPhase = useStore((s) => s.loadPhase)
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const loadFile = useStore((s) => s.loadFile)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center h-12 px-4 gap-4 bg-gray-900 border-b border-gray-800">
        <label
          htmlFor="topbar-file"
          className="flex items-center gap-2 cursor-pointer group"
          title="Charger un nouveau fichier"
        >
          <div className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors max-w-xs truncate">
            {fileName ?? 'Charger un fichier…'}
          </span>
          <input
            id="topbar-file"
            type="file"
            accept=".ifc"
            className="sr-only"
            onChange={handleFile}
          />
        </label>

        {ifcVersion && (
          <span
            className={`px-2 py-0.5 text-xs font-mono rounded ${VERSION_COLORS[ifcVersion] ?? 'bg-gray-700 text-gray-300'}`}
          >
            {ifcVersion}
          </span>
        )}

        <div className="flex-1" />

        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un Pset, une propriété…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 h-8 px-3 pr-8 text-sm bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <svg
            className="absolute right-2.5 top-2 w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {isLoading && (
        <div className="h-1 bg-gray-800 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-200"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      )}
      {isLoading && loadPhase && (
        <div className="px-4 py-1 text-xs text-gray-500 bg-gray-900 border-b border-gray-800">
          {loadPhase}
        </div>
      )}
    </div>
  )
}
```

---

## `src/components/LeftPanel.tsx`

```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { IFC_FR, ALLOWED_IFC_TYPES } from '../lib/ifcTranslations'
import type { EntityTypeSummary } from '../lib/types'

type SortMode = 'count' | 'alpha'

function EntityRow({
  summary,
  selected,
  maxCount,
  onClick,
}: {
  summary: EntityTypeSummary
  selected: boolean
  maxCount: number
  onClick: () => void
}) {
  const fr = IFC_FR[summary.type]
  const barWidth = maxCount > 0 ? (summary.count / maxCount) * 100 : 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 group focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
        selected ? 'bg-blue-900/60' : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col min-w-0 flex-1">
          {fr && (
            <span
              className={`text-xs font-medium truncate leading-tight ${
                selected ? 'text-blue-100' : 'text-gray-200 group-hover:text-white'
              }`}
            >
              {fr}
            </span>
          )}
          <span
            className={`text-xs font-mono truncate leading-tight ${
              selected ? 'text-blue-300' : 'text-gray-500'
            }`}
          >
            {summary.type}
          </span>
        </div>
        <span
          className={`text-xs tabular-nums flex-shrink-0 ${
            selected ? 'text-blue-300' : 'text-gray-600'
          }`}
        >
          {summary.count.toLocaleString('fr-FR')}
        </span>
      </div>
      <div className="mt-1 h-0.5 bg-gray-800">
        <div
          className={`h-full transition-all duration-300 ${
            selected ? 'bg-blue-500' : 'bg-gray-700'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </button>
  )
}

export function LeftPanel() {
  const allEntityTypes = useStore((s) => s.entityTypes)
  const selectedType = useStore((s) => s.selectedType)
  const selectType = useStore((s) => s.selectType)

  const [sortMode, setSortMode] = useState<SortMode>('count')
  const [search, setSearch] = useState('')

  const entityTypes = useMemo(() => {
    const q = search.trim().toLowerCase()

    let filtered = allEntityTypes.filter((s) => {
      if (!ALLOWED_IFC_TYPES.has(s.type)) return false
      if (!q) return true
      const fr = IFC_FR[s.type]?.toLowerCase() ?? ''
      return s.type.toLowerCase().includes(q) || fr.includes(q)
    })

    if (sortMode === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.type.localeCompare(b.type))
    }

    return filtered
  }, [allEntityTypes, sortMode, search])

  const maxCount = useMemo(
    () => (entityTypes.length > 0 ? Math.max(...entityTypes.map((e) => e.count)) : 1),
    [entityTypes]
  )

  return (
    <div className="flex flex-col h-full border-r border-gray-800 bg-gray-950">
      <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            Liste des entités IFC — {entityTypes.length}
          </span>
          <div className="flex gap-0.5 text-xs">
            <button
              onClick={() => setSortMode('count')}
              title="Trier par quantité"
              className={`px-1.5 py-0.5 transition-colors ${
                sortMode === 'count' ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              #
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              title="Trier alphabétiquement"
              className={`px-1.5 py-0.5 transition-colors ${
                sortMode === 'alpha' ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              A↓
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="IfcWall, Mur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 px-2 pr-6 text-xs bg-gray-900 border border-gray-800 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-gray-600"
          />
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1 text-gray-600 hover:text-gray-400 text-xs leading-none"
            >
              ✕
            </button>
          ) : (
            <svg
              className="absolute right-1.5 top-1.5 w-3.5 h-3.5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entityTypes.length === 0 && search && (
          <p className="px-3 py-4 text-xs text-gray-700 italic">
            Aucun résultat pour « {search} »
          </p>
        )}
        {entityTypes.map((s) => (
          <EntityRow
            key={s.type}
            summary={s}
            selected={s.type === selectedType}
            maxCount={maxCount}
            onClick={() => selectType(s.type)}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## `src/components/FileDropZone.tsx`

```tsx
import { useCallback, useState } from 'react'
import { useStore } from '../store/useStore'

export function FileDropZone() {
  const loadFile = useStore((s) => s.loadFile)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.ifc')) return
      loadFile(file)
    },
    [loadFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const onDragLeave = () => setDragging(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-150 ${
        dragging ? 'bg-gray-900' : 'bg-gray-950'
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <label
        htmlFor="ifc-file-input"
        className={`flex flex-col items-center gap-4 px-16 py-12 border-2 border-dashed cursor-pointer transition-colors duration-150 ${
          dragging
            ? 'border-blue-400 bg-blue-950/30'
            : 'border-gray-600 hover:border-gray-400 bg-gray-900'
        }`}
      >
        <svg
          className={`w-16 h-16 ${dragging ? 'text-blue-400' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div className="text-center">
          <p className="text-xl font-medium text-gray-200">
            {dragging ? 'Déposer le fichier' : 'Charger un fichier IFC'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Glisser-déposer ou cliquer pour sélectionner · Formats : .ifc
          </p>
        </div>
        <input
          id="ifc-file-input"
          type="file"
          accept=".ifc"
          className="sr-only"
          onChange={onInputChange}
        />
      </label>
    </div>
  )
}
```

---

## `src/components/InfoPanel.tsx`

```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { IFC_FR } from '../lib/ifcTranslations'
import type { AggregatedEntityData, AggregatedPset, AggregatedProperty, ValueAggregate } from '../lib/types'

function CoverageBadge({ present, total }: { present: number; total: number }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0
  const color =
    pct === 100 ? 'text-emerald-400' :
    pct >= 75   ? 'text-blue-400' :
    pct >= 40   ? 'text-yellow-500' :
                  'text-gray-600'
  return (
    <span className={`text-xs tabular-nums flex-shrink-0 ${color}`}>
      {present}/{total} <span className="text-gray-700">({pct}%)</span>
    </span>
  )
}

function AggregateValue({ agg }: { agg: ValueAggregate }) {
  const [expanded, setExpanded] = useState(false)

  if (agg.kind === 'empty') {
    return <span className="text-gray-700 text-xs italic">—</span>
  }

  if (agg.kind === 'numeric') {
    const same = agg.min === agg.max
    return (
      <span className="text-xs text-gray-300 font-mono">
        {same ? agg.min : `${agg.min} … ${agg.max}`}
      </span>
    )
  }

  const values = agg.distinctValues ?? []
  const limit = 3
  const visible = expanded ? values : values.slice(0, limit)
  const hasMore = values.length > limit

  return (
    <div className="text-xs">
      {values.length === 0 ? (
        <span className="text-gray-700 italic">—</span>
      ) : (
        <>
          <div className="space-y-0.5">
            {visible.map((v) => (
              <div key={v.value} className="flex items-baseline gap-1.5">
                <span className="text-gray-200 break-all">{v.value}</span>
                {v.count > 1 && (
                  <span className="text-gray-600 flex-shrink-0">×{v.count}</span>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-gray-600 hover:text-gray-400 text-xs"
            >
              {expanded
                ? '↑ Réduire'
                : `+ ${values.length - limit} autre${values.length - limit > 1 ? 's' : ''}…`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function PropRow({ prop, totalCount }: { prop: AggregatedProperty; totalCount: number }) {
  return (
    <div className="py-2 flex gap-2 border-b border-gray-900 last:border-0">
      <div className="w-40 flex-shrink-0">
        <span className="text-xs text-gray-400">{prop.name}</span>
      </div>
      <div className="flex-1 min-w-0">
        <AggregateValue agg={prop.aggregate} />
      </div>
      <CoverageBadge present={prop.aggregate.presentCount} total={totalCount} />
    </div>
  )
}

function PsetBlock({ pset, searchQ }: { pset: AggregatedPset; searchQ: string }) {
  const [open, setOpen] = useState(true)

  const visibleProps = useMemo(() => {
    if (!searchQ) return pset.properties
    const q = searchQ.toLowerCase()
    return pset.properties.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true
      const vals = p.aggregate.distinctValues ?? []
      return vals.some((v) => v.value.toLowerCase().includes(q))
    })
  }, [pset.properties, searchQ])

  if (searchQ && visibleProps.length === 0) return null

  return (
    <div className="mb-2 border border-gray-800 bg-gray-900/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xs font-mono text-gray-300">{pset.name}</span>
        <div className="flex items-center gap-3">
          <CoverageBadge present={pset.presentCount} total={pset.totalCount} />
          <span className="text-gray-700 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-1 border-t border-gray-800">
          {visibleProps.length === 0 ? (
            <p className="py-2 text-xs text-gray-700 italic">Aucune propriété</p>
          ) : (
            visibleProps.map((p) => (
              <PropRow key={p.name} prop={p} totalCount={pset.totalCount} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function exportCSV(data: AggregatedEntityData) {
  const rows: string[] = []
  rows.push(['Section', 'Nom', 'Couverture (x/y)', '%', 'Type', 'Valeurs'].join(','))

  const fmt = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

  for (const attr of data.attributes) {
    const agg = attr.aggregate
    const pct = data.totalCount > 0 ? Math.round((agg.presentCount / data.totalCount) * 100) : 0
    const cov = `${agg.presentCount}/${data.totalCount}`
    let valStr = ''
    if (agg.kind === 'numeric') valStr = `${agg.min} … ${agg.max}`
    else if (agg.distinctValues) valStr = agg.distinctValues.map((v) => `${v.value} (×${v.count})`).join(' | ')
    rows.push([fmt('Attributs'), fmt(attr.name), fmt(cov), fmt(pct + '%'), fmt(agg.kind), fmt(valStr)].join(','))
  }

  for (const pset of [...data.standardPsets, ...data.customPsets]) {
    const section = pset.isStandard ? 'Pset Standard' : 'Pset Personnalisé'
    const pctPset = data.totalCount > 0 ? Math.round((pset.presentCount / data.totalCount) * 100) : 0
    rows.push([fmt(section), fmt(pset.name), fmt(`${pset.presentCount}/${pset.totalCount}`), fmt(pctPset + '%'), fmt('pset'), fmt('')].join(','))
    for (const prop of pset.properties) {
      const agg = prop.aggregate
      const pct = data.totalCount > 0 ? Math.round((agg.presentCount / data.totalCount) * 100) : 0
      const cov = `${agg.presentCount}/${data.totalCount}`
      let valStr = ''
      if (agg.kind === 'numeric') valStr = `${agg.min} … ${agg.max}`
      else if (agg.distinctValues) valStr = agg.distinctValues.map((v) => `${v.value} (×${v.count})`).join(' | ')
      rows.push([fmt(section + ' > ' + pset.name), fmt(prop.name), fmt(cov), fmt(pct + '%'), fmt(agg.kind), fmt(valStr)].join(','))
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.entityType}_agrege.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function InfoPanel() {
  const selectedType = useStore((s) => s.selectedType)
  const aggregatedData = useStore((s) => s.aggregatedData)
  const searchQuery = useStore((s) => s.searchQuery)
  const isLoading = useStore((s) => s.isLoading)

  const searchQ = searchQuery.trim().toLowerCase()

  const filteredStandard = useMemo(() => {
    if (!aggregatedData || !searchQ) return aggregatedData?.standardPsets ?? []
    return aggregatedData.standardPsets.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQ) ||
        p.properties.some(
          (prop) =>
            prop.name.toLowerCase().includes(searchQ) ||
            (prop.aggregate.distinctValues ?? []).some((v) => v.value.toLowerCase().includes(searchQ))
        )
    )
  }, [aggregatedData, searchQ])

  const filteredCustom = useMemo(() => {
    if (!aggregatedData || !searchQ) return aggregatedData?.customPsets ?? []
    return aggregatedData.customPsets.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQ) ||
        p.properties.some(
          (prop) =>
            prop.name.toLowerCase().includes(searchQ) ||
            (prop.aggregate.distinctValues ?? []).some((v) => v.value.toLowerCase().includes(searchQ))
        )
    )
  }, [aggregatedData, searchQ])

  const filteredAttrs = useMemo(() => {
    if (!aggregatedData || !searchQ) return aggregatedData?.attributes ?? []
    return aggregatedData.attributes.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQ) ||
        (a.aggregate.distinctValues ?? []).some((v) => v.value.toLowerCase().includes(searchQ))
    )
  }, [aggregatedData, searchQ])

  if (!selectedType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm">Sélectionner un type dans la liste</p>
      </div>
    )
  }

  if (isLoading && !aggregatedData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm">Calcul en cours…</p>
      </div>
    )
  }

  if (!aggregatedData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm">Aucune donnée</p>
      </div>
    )
  }

  const fr = IFC_FR[aggregatedData.entityType]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-950">
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-800 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {fr && <p className="text-base font-semibold text-gray-100 leading-tight">{fr}</p>}
          <p className="text-xs font-mono text-gray-500">{aggregatedData.entityType}</p>
        </div>
        <span className="text-sm text-gray-500 flex-shrink-0">
          {aggregatedData.totalCount.toLocaleString('fr-FR')} occurrence{aggregatedData.totalCount > 1 ? 's' : ''}
        </span>
        <button
          onClick={() => exportCSV(aggregatedData)}
          className="px-2 py-1 text-xs text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
        >
          Exporter CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {filteredAttrs.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Attributs
            </h2>
            <div className="border border-gray-800 bg-gray-900/40">
              <div className="px-3 py-1 border-b border-gray-800 flex gap-2 text-xs text-gray-600">
                <span className="w-40 flex-shrink-0">Attribut</span>
                <span className="flex-1">Valeurs</span>
                <span className="flex-shrink-0">Couverture</span>
              </div>
              <div className="px-3">
                {filteredAttrs.map((attr) => (
                  <PropRow key={attr.name} prop={attr} totalCount={aggregatedData.totalCount} />
                ))}
              </div>
            </div>
          </section>
        )}

        {filteredStandard.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Pset Standards
            </h2>
            {filteredStandard.map((pset) => (
              <PsetBlock key={pset.name} pset={pset} searchQ={searchQ} />
            ))}
          </section>
        )}

        {filteredCustom.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Pset Personnalisés
            </h2>
            {filteredCustom.map((pset) => (
              <PsetBlock key={pset.name} pset={pset} searchQ={searchQ} />
            ))}
          </section>
        )}

        {searchQ && filteredAttrs.length === 0 && filteredStandard.length === 0 && filteredCustom.length === 0 && (
          <p className="text-gray-700 text-sm italic text-center py-8">
            Aucun résultat pour « {searchQuery} »
          </p>
        )}

        {!searchQ && aggregatedData.standardPsets.length === 0 && aggregatedData.customPsets.length === 0 && (
          <p className="text-gray-700 text-sm italic text-center py-4">
            Aucun Pset trouvé sur ces instances
          </p>
        )}
      </div>
    </div>
  )
}
```

---

## Instructions pour déployer sur GitHub Pages

Une fois tous les fichiers créés et le build lancé (`npm install && npm run build`), exécute ces commandes pour déployer :

```bash
# Copier le build dans explorer/
cp -r dist/ explorer/

# Commiter et pousser
git add explorer/
git commit -m "deploy: initial build on GitHub Pages"
git push origin main
```

Puis dans les paramètres GitHub du repo :
- **Settings → Pages → Source** : `Deploy from a branch`
- **Branch** : `main`, dossier : `/ (root)`

L'application sera accessible à :
`https://nvalettepro-sudo.github.io/NOM_DU_REPO/explorer/`
