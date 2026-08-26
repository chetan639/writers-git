import React, { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface ProjectSetupProps {
  onProjectCreated: (uuid: string, title: string) => void;
}

export default function ProjectSetup({ onProjectCreated }: ProjectSetupProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Book Title is required');

    setIsCreating(true);
    try {
      const response = await api.post('/projects', {
        title: title,
      });

      const { project_uuid } = response.data;
      toast.success('Project created successfully!');
      onProjectCreated(project_uuid, title);
    } catch (error) {
      toast.error('Failed to create project. Is the backend running?');
      console.error('CORS or Network Error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Setup GitWriter</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
              placeholder="e.g., The Winds of Winter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}