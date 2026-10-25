import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Mic,
  Type,
  LayoutDashboard,
  Send,
  Calendar,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  ChevronRight,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Create',
    items: [
      { id: 'ai-tools', label: 'AI Tools', icon: Sparkles, badge: 'New' },
      { id: 'image', label: 'Image Generator', icon: ImageIcon },
      { id: 'video', label: 'Video Generator', icon: Video },
      { id: 'audio', label: 'Audio Generator', icon: Mic },
      { id: 'text', label: 'Text Generator', icon: Type },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Preview Dashboard', icon: LayoutDashboard },
      { id: 'compose', label: 'Compose', icon: Send },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    label: 'Insights',
    items: [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }],
  },
];

export default function Sidebar() {
  const [active, setActive] = useState('ai-tools');

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-full shrink-0">
      <style>{`
        @keyframes sidebar-fade-in { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
        .sidebar-item-enter { animation: sidebar-fade-in .35s ease both; }
      `}</style>

      {/* Logo */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-sm shadow-blue-200 shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            AI Studio
          </span>
        </div>
      </div>

      {/* Primary action */}
      <div className="px-3 pt-4">
        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-sm shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-200 hover:-translate-y-0.5 transition-all duration-200">
          <Plus size={16} strokeWidth={2.5} />
          New Campaign
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item, i) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={`sidebar-item-enter relative w-full flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-xl font-semibold text-sm text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {/* active accent bar */}
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-blue-600 transition-all duration-200 ${
                        isActive ? 'h-4 opacity-100' : 'h-0 opacity-0'
                      }`}
                    />
                    <Icon
                      size={16}
                      strokeWidth={2.25}
                      className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                        {item.badge}
                      </span>
                    )}
                    {!item.badge && isActive && (
                      <ChevronRight size={14} className="text-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: utilities + account */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold text-sm transition-colors">
          <Settings size={16} strokeWidth={2.25} />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold text-sm transition-colors">
          <HelpCircle size={16} strokeWidth={2.25} />
          Help & Support
        </button>

        <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100/70">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            YM
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-xs font-bold text-slate-800 truncate">Yamuna</div>
            <div className="text-[10px] font-semibold text-blue-500">Pro Plan</div>
          </div>
        </div>
      </div>
    </div>
  );
}