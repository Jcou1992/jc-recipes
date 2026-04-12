'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-xl text-stone-800 hover:text-orange-500 transition-colors"
        >
          Mis Recetas
        </Link>
        <Link
          href="/recipes/new"
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
        >
          + Nueva receta
        </Link>
      </div>
    </nav>
  );
}
