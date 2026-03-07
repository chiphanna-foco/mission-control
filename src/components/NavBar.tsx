'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lightbulb, Grid2X2, Settings } from 'lucide-react';
import { getDeployBadge } from '@/lib/build-info';

export default function NavBar() {
  const pathname = usePathname();
  const deployBadge = getDeployBadge();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="border-b border-mc-border bg-mc-bg-secondary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">🦞</span>
              <div className="flex items-baseline gap-2">
                <span>Mission Control</span>
                <span className="text-xs text-mc-text-secondary/60 bg-mc-bg/50 px-2 py-1 rounded font-mono">
                  {deployBadge}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/mission-control"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/mission-control')
                    ? 'bg-mc-accent/20 text-mc-accent'
                    : 'text-mc-text-secondary hover:bg-mc-bg/50'
                }`}
              >
                <Grid2X2 className="w-4 h-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>

              <Link
                href="/executive"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/executive')
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-mc-text-secondary hover:bg-mc-bg/50'
                }`}
              >
                <Grid2X2 className="w-4 h-4" />
                <span className="text-sm font-medium">Executive</span>
              </Link>

              <Link
                href="/ideas"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/ideas')
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'text-mc-text-secondary hover:bg-mc-bg/50'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">Ideas</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 rounded-lg text-mc-text-secondary hover:bg-mc-bg/50 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
