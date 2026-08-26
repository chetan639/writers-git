import React from 'react';
import { diffWords } from 'diff';

interface DiffVisualizerProps {
  oldText: string;
  newText: string;
}

export default function DiffVisualizer({ oldText, newText }: DiffVisualizerProps) {
  const diffParts = diffWords(oldText, newText);

  return (
    <div className="p-4 bg-gray-50 border rounded-md whitespace-pre-wrap font-mono text-sm h-[500px] overflow-y-auto">
      {diffParts.map((part, index) => {
        let spanClass = 'text-gray-800'; // unchanged text
        
        if (part.added) {
          spanClass = 'bg-green-200 text-green-900 px-1 rounded';
        } else if (part.removed) {
          spanClass = 'bg-red-200 text-red-900 line-through px-1 rounded';
        }

        return (
          <span key={index} className={spanClass}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
}