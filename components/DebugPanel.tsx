import React from 'react';

interface DebugPanelProps {
  data: any;
  title?: string;
  show?: boolean;
}

export default function DebugPanel({ data, title = 'Debug Info', show = false }: DebugPanelProps) {
  if (!show) return null;

  return (
    <div className="bg-black bg-opacity-95 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-64 mt-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-yellow-400">{title}</h3>
        <span className="text-gray-500 text-xs">Development Mode Only</span>
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
