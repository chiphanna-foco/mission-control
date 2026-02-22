'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, AlertTriangle, Bot } from 'lucide-react';
import { useMissionControl } from '@/lib/store';

interface MobileNavProps {
  workspaceSlug?: string;
  onAgentsClick?: () => void;
}

export function MobileNav({ workspaceSlug, onAgentsClick }: MobileNavProps) {
  const pathname = usePathname();
  const { tasks } = useMissionControl();

  const waitingCount = tasks.filter(
    (t) => t.blocked_on === 'chip' && t.status !== 'done'
  ).length;

  const dashboardHref = workspaceSlug ? `/workspace/${workspaceSlug}` : '/';
  const isDashboard = pathname === '/' || (!!workspaceSlug && pathname === `/workspace/${workspaceSlug}`);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-mc-bg-secondary border-t border-mc-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        <Link
          href={dashboardHref}
          className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors ${
            isDashboard
              ? 'text-mc-accent'
              : 'text-mc-text-secondary active:text-mc-text'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>

        <Link
          href="/waiting"
          className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors ${
            pathname === '/waiting'
              ? 'text-mc-accent'
              : 'text-mc-text-secondary active:text-mc-text'
          }`}
        >
          <div className="relative">
            <AlertTriangle className="w-5 h-5" />
            {waitingCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-mc-accent-red text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {waitingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Waiting</span>
        </Link>

        {onAgentsClick ? (
          <button
            onClick={onAgentsClick}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors text-mc-text-secondary active:text-mc-text"
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px] font-medium">Agents</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors text-mc-text-secondary active:text-mc-text"
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px] font-medium">Agents</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
