import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Project {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardProps {
  onStartNewBook: () => void;
  onOpenProject: (uuid: string, title: string) => void;
}

export default function Dashboard({ onStartNewBook, onOpenProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data.projects || []);
      } catch (error) {
        toast.error('Failed to load projects.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Your Books</h2>
        <button
          onClick={onStartNewBook}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
        >
          + Start New Book
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">You haven&apos;t written any books yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div 
              key={proj.id} 
              onClick={() => onOpenProject(proj.id, proj.title)}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{proj.title}</h3>
              <p className="text-sm text-gray-500">
                Created: {new Date(proj.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}