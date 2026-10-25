import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenSquare,
  Calendar,
  Target,
  Users,
  Settings,
  Bell,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
} from 'lucide-react';

function Sidebar({ onLogout, collapsed, onToggleCollapse, isMobile, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'dashboard';

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'compose', label: 'Compose', icon: PenSquare },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'drafts', label: 'Drafts', icon: FileText },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: Target },
    { id: 'team-hub', label: 'Team Hub', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      role="complementary"
      aria-label="Sidebar navigation container"
      className={`${
        collapsed && !isMobile ? 'w-20' : 'w-[250px]'
      } bg-white border-r border-[#E5E7EB] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out relative z-30 h-full text-[#111827]`}
    >
      {/* Toggle Button (Desktop only) */}
      {!isMobile && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-6 w-6 h-6 rounded bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-all z-30"
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      )}

      {/* Top Section */}
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* Project Name / Logo */}
        <div className={`pt-6 pb-4 px-6 flex items-center gap-3 ${collapsed && !isMobile ? 'justify-center px-0' : ''}`}>
          <img src="/logo.png" alt="Scripta Logo" className="w-8 h-8 object-contain shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="font-bold text-lg tracking-tight text-[#111827]">Scripta</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-hide" aria-label="Main navigation">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPath === tab.id;
            return (
              <NavLink
                to={`/${tab.id}`}
                key={tab.id}
                onClick={() => {
                  if (isMobile) onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`sidebar-link group flex items-center gap-3 px-3 h-[44px] rounded-lg transition-all relative ${
                  isActive 
                    ? 'bg-[#4F46E5] text-white shadow-sm font-medium' 
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC]'
                } ${collapsed && !isMobile ? 'justify-center px-0' : ''}`}
                title={collapsed && !isMobile ? tab.label : undefined}
              >
                {isActive && (!collapsed || isMobile) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-md" />
                )}
                <Icon size={20} className={isActive ? 'text-white' : 'text-[#6B7280] group-hover:text-[#111827]'} aria-hidden="true" />
                {(!collapsed || isMobile) && (
                  <span className="truncate text-sm">{tab.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-[#E5E7EB] flex flex-col gap-2">
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out of Scripta"
          className={`flex items-center gap-3 px-3 h-[44px] rounded-lg text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-all ${collapsed && !isMobile ? 'justify-center px-0' : ''}`}
          title={collapsed && !isMobile ? 'Logout' : undefined}
        >
          <LogOut size={18} aria-hidden="true" />
          {(!collapsed || isMobile) && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
