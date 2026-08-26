"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Workspace from '../../../components/Workspace';
import api from '../../../lib/api';

import { useParams } from 'next/navigation';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Untitled Book';
  
  const [lastSavedText, setLastSavedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      if (!params?.id) return;
      try {
        const res = await api.get(`/projects/${params.id}/content?file_path=chapter_1.md`);
        if (res.data && res.data.content) {
          setLastSavedText(res.data.content);
        }
      } catch (error) {
        console.error("Failed to load project content:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [params?.id]);

  return (
    <main>
      <header className="bg-gray-900 text-white py-4 px-6 shadow-md flex justify-between">
        <h1 className="text-xl font-bold tracking-tight cursor-pointer" onClick={() => router.push('/dashboard')}>
          GitWriter Dashboard
        </h1>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading project...</p>
        </div>
      ) : (
        <Workspace 
          bookTitle={title}
          lastSavedText={lastSavedText}
          setLastSavedText={setLastSavedText}
        />
      )}
    </main>
  );
}