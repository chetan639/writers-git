"use client";
import { useRouter } from 'next/navigation';
import ProjectSetup from '../../components/ProjectSetup';
import AppHeader from '../../components/AppHeader';

export default function SetupPage() {
  const router = useRouter();

  return (
    <>
      <AppHeader context="New manuscript" />
      <main className="flex-1">
        <ProjectSetup
          onProjectCreated={(uuid, title) => {
            router.push(`/workspace/${uuid}?title=${encodeURIComponent(title)}`);
          }}
        />
      </main>
    </>
  );
}
