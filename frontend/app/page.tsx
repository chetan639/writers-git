"use client";
import AuthScreen from '../components/AuthScreen';

export default function LoginPage() {
  return (
    <main>
      <header className="bg-gray-900 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">GitWriter</h1>
      </header>
      <AuthScreen />
    </main>
  );
}