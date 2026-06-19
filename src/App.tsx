import React from 'react';
import { useStore } from './store/useStore';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { FileDropZone } from './components/FileDropZone';

function App() {
  const { fileName, isLoading, error } = useStore();

  const showDropZone = !fileName && !isLoading;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-200 overflow-hidden">
      {showDropZone && <FileDropZone />}

      <TopBar />

      {error && (
        <div className="px-4 py-2 bg-red-900 border-b border-red-700 text-red-300 text-sm flex-shrink-0">
          <span className="font-semibold">Erreur : </span>{error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  );
}

export default App;
