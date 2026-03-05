'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader, RefreshCw } from 'lucide-react';

export interface AttendeeInfo {
  name: string;
  email: string;
  company?: string;
  headline?: string;
  about?: string;
  photoUrl?: string;
  recentPosts?: Array<{ text: string; timestamp: string }>;
  linkedInUrl?: string;
  isInferred?: boolean;
  isScraped?: boolean;
}

interface AttendeeProfileCardProps {
  attendee: { name: string; email: string };
  onClose?: () => void;
}

export function AttendeeProfileCard({ attendee, onClose }: AttendeeProfileCardProps) {
  const [profile, setProfile] = useState<AttendeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [source, setSource] = useState<'inferred' | 'cached' | 'scraping'>('inferred');

  useEffect(() => {
    fetchProfile(false);
  }, [attendee.name, attendee.email]);

  const fetchProfile = async (triggerScrape = false) => {
    try {
      setLoading(true);
      const url = `/api/linkedin/profile?name=${encodeURIComponent(attendee.name)}&email=${encodeURIComponent(attendee.email)}${triggerScrape ? '&scrape=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.profile) {
        setProfile(data.profile);
        setSource(data.source);

        // If scraping was queued, poll for updates
        if (data.scrapingQueued) {
          setScraping(true);
          // Poll for scraped profile every 2 seconds for up to 30 seconds
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > 15) {
              clearInterval(pollInterval);
              setScraping(false);
              return;
            }

            try {
              const updateRes = await fetch(
                `/api/linkedin/profile?name=${encodeURIComponent(attendee.name)}&email=${encodeURIComponent(attendee.email)}`,
              );
              const updateData = await updateRes.json();
              if (updateData.profile?.isScraped) {
                setProfile(updateData.profile);
                setSource('cached');
                clearInterval(pollInterval);
                setScraping(false);
              }
            } catch (e) {
              console.error('Polling error:', e);
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4 w-96 shadow-lg">
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          <p className="text-sm text-stone-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4 w-96 shadow-lg">
        <p className="text-sm text-stone-600">Profile not found</p>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white w-96 shadow-lg overflow-hidden">
      {/* Header with photo */}
      {profile.photoUrl && (
        <div className="relative w-full h-32 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="absolute -bottom-8 left-4">
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full border-4 border-white object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full p-1"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="p-4 pt-10">
        {/* Profile info */}
        <div className="mb-4">
          <p className="font-bold text-stone-900 text-lg">{profile.name}</p>
          {profile.headline && (
            <p className="text-sm text-stone-700 font-medium">{profile.headline}</p>
          )}
          {profile.company && (
            <p className="text-xs text-stone-600 mt-1">{profile.company}</p>
          )}
        </div>

        {/* About section */}
        {profile.about && (
          <div className="mb-4 pb-4 border-b border-stone-200">
            <p className="text-xs text-stone-600 font-semibold mb-1">About</p>
            <p className="text-xs text-stone-700 line-clamp-3">{profile.about}</p>
          </div>
        )}

        {/* Recent posts */}
        {profile.recentPosts && profile.recentPosts.length > 0 && (
          <div className="mb-4 pb-4 border-b border-stone-200">
            <p className="text-xs text-stone-600 font-semibold mb-2">Recent Activity</p>
            <div className="space-y-2">
              {profile.recentPosts.map((post, idx) => (
                <div key={idx} className="text-xs bg-stone-50 p-2 rounded">
                  <p className="text-stone-700 line-clamp-2">{post.text}</p>
                  <p className="text-stone-500 mt-1 text-xs">{formatTime(post.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="mb-4 pb-4 border-b border-stone-200">
          <p className="text-xs text-stone-600 font-semibold mb-1">Email</p>
          <a
            href={`mailto:${profile.email}`}
            className="text-xs text-blue-600 hover:text-blue-700 truncate"
          >
            {profile.email}
          </a>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <a
            href={profile.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
          >
            View on LinkedIn
            <ExternalLink className="w-3 h-3" />
          </a>

          {!profile.isScraped && !scraping && (
            <button
              onClick={() => fetchProfile(true)}
              className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Fetch Full Profile
            </button>
          )}

          {scraping && (
            <div className="flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-700">
              <Loader className="w-3 h-3 animate-spin" />
              Scraping profile...
            </div>
          )}
        </div>

        {/* Source badge */}
        <p className="text-xs text-stone-500 mt-3 text-center italic">
          {source === 'cached' && profile.isScraped ? 'Full profile' : 'Basic profile'} • {source}
        </p>
      </div>
    </div>
  );
}
