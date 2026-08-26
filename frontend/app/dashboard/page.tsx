"use client";
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Dashboard from '../../components/Dashboard';
import AppHeader from '../../components/AppHeader';
import { LogOutIcon } from '../../components/ui/icons';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/logout'); // Backend clears the cookie
      router.push('/');
    } catch (error) {
      toast.error('Could not log out. Try again.');
      console.error('Logout failed', error);
    }
  };

  return (
    <>
      <AppHeader
        actions={
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <LogOutIcon size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        }
      />
      <main className="flex-1">
        <Dashboard
          onStartNewBook={() => router.push('/setup')}
          onOpenProject={(uuid, title) => {
            // Pass the title in the URL params so the workspace has it
            router.push(`/workspace/${uuid}?title=${encodeURIComponent(title)}`);
          }}
        />
      </main>
    </>
  );
}
