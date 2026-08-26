"use client";
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/logout'); // Backend clears the cookie
      router.push('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <main>
      <header className="bg-gray-900 text-white py-4 px-6 shadow-md flex justify-between">
        <h1 className="text-xl font-bold tracking-tight">GitWriter</h1>
        <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">Log Out</button>
      </header>
      <Dashboard 
        onStartNewBook={() => router.push('/setup')}
        onOpenProject={(uuid, title) => {
          // Pass the title in the URL params so the workspace has it
          router.push(`/workspace/${uuid}?title=${encodeURIComponent(title)}`);
        }}
      />
    </main>
  );
}