// PlatformPreviewCard.jsx — Realistic platform-specific post previews
import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, ThumbsUp, Repeat2, Eye } from 'lucide-react';

const PLATFORM_LIMITS = {
  instagram: 2200, facebook: 63206, linkedin: 3000, youtube: 5000,
};

function InstagramPreview({ caption, mediaUrl, hashtags, theme }) {
  const dark = theme === 'dark';
  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm max-w-sm mx-auto ${dark ? 'bg-black border-zinc-800' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
          <div className={`w-full h-full rounded-full ${dark ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
            <span className="text-xs">👤</span>
          </div>
        </div>
        <div>
          <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-black'}`}>your_brand</p>
          <p className="text-[10px] text-gray-400">Sponsored</p>
        </div>
        <span className="ml-auto text-gray-400 text-lg">···</span>
      </div>
      {/* Media */}
      {mediaUrl ? (
        <img src={mediaUrl} alt="Post" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
          <span className="text-4xl">📸</span>
        </div>
      )}
      {/* Actions */}
      <div className={`px-3 py-2.5 space-y-2 ${dark ? 'bg-black' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <Heart size={20} className={dark ? 'text-white' : 'text-black'} />
          <MessageCircle size={20} className={dark ? 'text-white' : 'text-black'} />
          <Share2 size={20} className={dark ? 'text-white' : 'text-black'} />
          <Bookmark size={20} className={`ml-auto ${dark ? 'text-white' : 'text-black'}`} />
        </div>
        <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-black'}`}>1,234 likes</p>
        {caption && (
          <div className={`text-xs leading-relaxed ${dark ? 'text-white' : 'text-black'}`}>
            <span className="font-semibold">your_brand</span>{' '}
            <span className="line-clamp-3">{caption}</span>
          </div>
        )}
        {hashtags.length > 0 && (
          <p className="text-xs text-blue-500 line-clamp-2">{hashtags.slice(0, 5).join(' ')}</p>
        )}
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">2 hours ago</p>
      </div>
    </div>
  );
}

function FacebookPreview({ caption, mediaUrl, hashtags, theme }) {
  const dark = theme === 'dark';
  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm max-w-sm mx-auto ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">B</span>
        </div>
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-black'}`}>Your Brand Page</p>
          <p className="text-xs text-gray-400">Just now · 🌍</p>
        </div>
        <span className="ml-auto text-gray-400 text-lg">···</span>
      </div>
      {caption && (
        <div className={`px-3 pb-2.5 text-sm leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
          <span className="line-clamp-5">{caption}</span>
          {hashtags.length > 0 && (
            <p className="text-blue-500 text-xs mt-1">{hashtags.slice(0, 4).join(' ')}</p>
          )}
        </div>
      )}
      {mediaUrl && <img src={mediaUrl} alt="Post" className="w-full max-h-48 object-cover" />}
      <div className={`px-3 py-2 border-t ${dark ? 'border-zinc-700' : 'border-slate-100'}`}>
        <div className="flex justify-around">
          {['👍 Like', '💬 Comment', '↗️ Share'].map(a => (
            <button key={a} className={`text-xs font-medium py-1.5 px-2 rounded-lg ${dark ? 'text-gray-300 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-50'}`}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}



function LinkedInPreview({ caption, mediaUrl, hashtags, theme }) {
  const dark = theme === 'dark';
  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm max-w-sm mx-auto ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start gap-2.5 px-3 py-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-sm font-bold">B</span>
        </div>
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-black'}`}>Your Brand</p>
          <p className="text-xs text-gray-400">1,234 followers · Just now</p>
        </div>
      </div>
      {caption && (
        <div className={`px-3 pb-2 text-sm leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
          <span className="line-clamp-6">{caption}</span>
          {hashtags.length > 0 && (
            <p className="text-blue-500 text-xs mt-1">{hashtags.slice(0, 5).map(h => h.startsWith('#') ? h : '#' + h).join(' ')}</p>
          )}
        </div>
      )}
      {mediaUrl && <img src={mediaUrl} alt="Post" className="w-full max-h-48 object-cover" />}
      <div className={`px-3 py-1.5 border-t ${dark ? 'border-zinc-700' : 'border-slate-100'}`}>
        <div className="flex justify-around">
          {['👍 Like', '💬 Comment', '↗️ Repost', '📤 Send'].map(a => (
            <button key={a} className={`text-xs font-medium py-1.5 px-1 ${dark ? 'text-gray-300' : 'text-gray-500'}`}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function YouTubePreview({ caption, mediaUrl, theme }) {
  const dark = theme === 'dark';
  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm max-w-sm mx-auto ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}`}>
      {mediaUrl ? (
        <div className="relative">
          <img src={mediaUrl} alt="Thumbnail" className="w-full aspect-video object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-600 rounded-full p-3 shadow-lg">
              <span className="text-white text-xl">▶</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`aspect-video flex items-center justify-center ${dark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
          <div className="bg-red-600 rounded-full p-4">
            <span className="text-white text-2xl">▶</span>
          </div>
        </div>
      )}
      <div className="p-3 flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-xs">B</span>
        </div>
        <div>
          <p className={`text-sm font-semibold line-clamp-2 ${dark ? 'text-white' : 'text-black'}`}>{caption || 'Your video title here'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Your Brand · 1.2K views · Just now</p>
        </div>
      </div>
    </div>
  );
}

export default function PlatformPreviewCard({ platform, caption = '', mediaUrl, hashtags = [], theme = 'light', mode = 'mobile' }) {
  caption = caption || '';
  hashtags = hashtags || [];
  const previewProps = { caption, mediaUrl, hashtags, theme };

  const preview = {
    instagram: <InstagramPreview {...previewProps} />,
    facebook: <FacebookPreview {...previewProps} />,

    linkedin: <LinkedInPreview {...previewProps} />,
    youtube: <YouTubePreview {...previewProps} />,
  }[platform];

  const limit = PLATFORM_LIMITS[platform] || 2200;
  const charCount = caption.length;
  const over = charCount > limit;

  return (
    <div className="space-y-3">
      <div className={`transition-all duration-200 ${mode === 'desktop' ? 'scale-100' : 'scale-90 origin-top'}`}>
        {preview || <div className="text-center py-8 text-slate-400 text-sm">Preview not available for this platform</div>}
      </div>
      {/* Char counter */}
      <div className={`flex items-center justify-between text-xs px-1 ${over ? 'text-red-500' : 'text-slate-400'}`}>
        <span>{over ? '⚠️ Exceeds limit' : '✓ Within limit'}</span>
        <span className={`font-mono font-semibold ${over ? 'text-red-500' : ''}`}>{charCount.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
    </div>
  );
}
