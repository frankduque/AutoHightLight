'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Plus, Video } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  
  return (
    <header className="border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">AutoHighlights</span>
              <span className="text-xs text-slate-300">Fase 1 - Beta</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-2">
              <Link 
                href="/" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  pathname === '/' 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Adicionar</span>
              </Link>
              <Link 
                href="/videos" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  pathname === '/videos' 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-4 h-4" />
                <span className="text-sm font-medium">Meus Vídeos</span>
              </Link>
            </nav>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema Operacional
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
