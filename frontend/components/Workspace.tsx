import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import "easymde/dist/easymde.min.css";
import DiffVisualizer from './DiffVisualizer';
import api from '../lib/api';

const SimpleMdeReact = dynamic(() => import('react-simplemde-editor'), { ssr: false });

interface WorkspaceProps {
  bookTitle: string;
  lastSavedText: string;
  setLastSavedText: (text: string) => void;
}

export default function Workspace({ bookTitle, lastSavedText, setLastSavedText }: WorkspaceProps) {
  const params = useParams();
  const projectUuid = params?.id as string;

  const [filePath, setFilePath] = useState('chapter_1.md');
  const [currentText, setCurrentText] = useState(lastSavedText);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Sync editor content when lastSavedText is loaded asynchronously
  useEffect(() => {
    setCurrentText(lastSavedText);
  }, [lastSavedText]);

  // Stable options reference — prevents SimpleMDE from reinitializing
  // CodeMirror on every render, which would reset the cursor position
  const editorOptions = useMemo(() => ({
    spellChecker: false,
    minHeight: '500px',
    autofocus: true,
  }), []);



  const handleCommit = async () => {
    if (!projectUuid) {
      return toast.error('Project UUID is missing. Cannot save.');
    }
    if (!filePath.trim() || !filePath.endsWith('.md')) {
      return toast.error('Please provide a valid file path ending in .md');
    }
    if (currentText === lastSavedText) {
      return toast('No changes to commit.', { icon: 'ℹ️' });
    }

    setIsSaving(true);
    try {
      const response = await api.post('/projects/save', {
        project_uuid: projectUuid,
        file_path: filePath,
        content: currentText,
        // author_name is entirely removed. Backend handles it via the HttpOnly JWT!
      });

      setLastSavedText(currentText);
      toast.success(`Committed! Hash: ${response.data.commit_hash}`);
      setShowDiff(false);
    } catch (error) {
      toast.error('Failed to commit changes.');
      console.error('Commit Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{bookTitle}</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">ID: {projectUuid}</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setShowDiff(!showDiff)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            {showDiff ? 'Back to Editor' : 'Compare Changes'}
          </button>
          
          <button 
            onClick={handleCommit}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : null}
            {isSaving ? 'Committing...' : 'Commit to Git'}
          </button>
        </div>
      </div>

      {/* Dynamic Inputs Area */}
      <div className="bg-white p-4 rounded-t-lg border-t border-l border-r border-gray-200 bg-gray-50">
        <div className="flex flex-col max-w-xs">
          <label className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">File Path</label>
          <input 
            type="text" 
            value={filePath} 
            onChange={(e) => setFilePath(e.target.value)}
            className="px-3 py-1 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="e.g., chapter_1.md"
          />
        </div>
      </div>

      {/* Editor Area */}
      <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-1 border-t-0">
        {showDiff ? (
          <DiffVisualizer oldText={lastSavedText} newText={currentText} />
        ) : (
          <SimpleMdeReact 
            key={lastSavedText ? 'loaded' : 'empty'}
            value={currentText} 
            onChange={setCurrentText}
            options={editorOptions}
          />
        )}
      </div>
    </div>
  );
}