import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export function FileDropZone() {
  const { loadFile } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.ifc')) {
      alert('Seuls les fichiers .ifc sont acceptés.');
      return;
    }
    loadFile(file);
  }, [loadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors ${
        isDragOver ? 'bg-blue-950' : 'bg-gray-950'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ifc"
        className="hidden"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
      />

      <div className={`text-center select-none transition-all ${isDragOver ? 'scale-105' : ''}`}>
        <div className={`text-6xl mb-6 ${isDragOver ? 'text-blue-400' : 'text-gray-700'}`}>
          ⬡
        </div>
        <h1 className={`text-2xl font-bold mb-2 ${isDragOver ? 'text-blue-300' : 'text-gray-300'}`}>
          IFC Data Explorer
        </h1>
        <p className={`text-sm mb-6 ${isDragOver ? 'text-blue-400' : 'text-gray-500'}`}>
          {isDragOver
            ? 'Déposez le fichier .ifc ici'
            : 'Glissez un fichier .ifc ici, ou cliquez pour parcourir'}
        </p>
        <div className={`inline-block px-4 py-2 border text-sm rounded transition-colors ${
          isDragOver
            ? 'border-blue-500 text-blue-400 bg-blue-900'
            : 'border-gray-700 text-gray-500 bg-gray-900'
        }`}>
          .ifc uniquement
        </div>
      </div>
    </div>
  );
}
