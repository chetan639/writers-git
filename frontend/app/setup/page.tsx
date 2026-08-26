"use client";
import { useRouter } from 'next/navigation';
import ProjectSetup from '../../components/ProjectSetup';

export default function SetupPage() {
  const router = useRouter();

  return (
    <main>
      <header className="bg-gray-900 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold tracking-tight cursor-pointer" onClick={() => router.push('/dashboard')}>
          GitWriter
        </h1>
      </header>
      <ProjectSetup 
        onProjectCreated={(uuid, title) => {
          router.push(`/workspace/${uuid}?title=${encodeURIComponent(title)}`);
        }} 
      />
    </main>
  );
}