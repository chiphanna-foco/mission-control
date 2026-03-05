'use client';

import { useState } from 'react';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function IdeasPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-mc-bg">
      {/* Header */}
      <header className="border-b border-mc-border bg-mc-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/mission-control" className="text-mc-accent hover:text-mc-accent/80">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h1 className="text-2xl font-bold">💡 Idea Builder</h1>
            </div>
          </div>
          <p className="text-mc-text-secondary mt-2">
            Capture, organize, and search all your ideas in one place
          </p>
        </div>
      </header>

      {/* Iframe Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-mc-bg-secondary rounded-lg border border-mc-border overflow-hidden shadow-lg">
          <iframe
            src="http://localhost:3002/idea-builder"
            title="Idea Builder"
            className="w-full border-none"
            style={{ minHeight: '800px' }}
            allow="same-origin"
          />
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-bold mb-2">Capture Ideas</h3>
            <p className="text-sm text-mc-text-secondary">
              Quickly add ideas from Slack, email, or directly here
            </p>
          </div>

          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-bold mb-2">Full-Text Search</h3>
            <p className="text-sm text-mc-text-secondary">
              Instantly find ideas with powerful search across all projects
            </p>
          </div>

          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-bold mb-2">Weekly Digest</h3>
            <p className="text-sm text-mc-text-secondary">
              Get a summary of your best ideas organized by project
            </p>
          </div>
        </div>

        {/* Quick Integration */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span>🤖</span> Slack Integration (Coming Soon)
          </h3>
          <p className="text-sm text-mc-text-secondary mb-4">
            React with 💡 on any Slack message to automatically save it as an idea. Use
            <code className="bg-mc-bg px-2 py-1 rounded mx-1">/add-idea</code>
            to quickly capture ideas with project tags.
          </p>
          <div className="bg-mc-bg rounded p-4 text-xs font-mono text-mc-text-secondary overflow-x-auto">
            /add-idea "Pura comparison post" #wetried
          </div>
        </div>
      </main>
    </div>
  );
}
