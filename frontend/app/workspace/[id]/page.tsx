"use client";
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Workspace from '../../../components/Workspace';
import AppHeader from '../../../components/AppHeader';
import api from '../../../lib/api';

export default function WorkspacePage() {
  const params = useParams();
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
    <>
      <AppHeader context={<span className="truncate">{title}</span>} />
      <main className="flex-1">
        {isLoading ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <div className="mb-6 h-10 w-64 animate-pulse rounded-lg bg-surface-2" />
            <div className="card h-[70vh] animate-pulse bg-surface-2" />
          </div>
        ) : (
          <Workspace
            bookTitle={title}
            lastSavedText={lastSavedText}
            setLastSavedText={setLastSavedText}
          />
        )}
      </main>
    </>
  );
}
