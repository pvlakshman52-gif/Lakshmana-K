import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { DrBatrasLogo } from './DrBatrasLogo';
import { NAVIGATION_GROUPS, NavGroup, NavSubItem } from '../../config/navigationConfig';
import { useClinic } from '../../context/ClinicContext';

interface AppSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenBackup: () => void;
  onOpenSqlServer?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
  onOpenPwaSync?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  onToggleCollapse,
  onOpenBackup,
  onOpenSqlServer,
  onOpenPwaSync
}) => {
  const { currentUser } = useClinic();
  const isAdmin = currentUser.role === 'Admin';

  // Filter groups based on admin privileges
  const visibleGroups = NAVIGATION_GROUPS.filter(g => !g.adminOnly || isAdmin);

  // Determine active group ID from currentTab
  const getActiveGroupId = (tab: string): string => {
    const group = visibleGroups.find(g => 
      g.primaryRoute === tab || g.subItems.some(sub => sub.route === tab)
    );
    return group ? group.id : 'dashboard';
  };

  // State of open/expanded accordions under left main menu
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = getActiveGroupId(currentTab);
    return { [active]: true };
  });

  // Keep active group expanded when currentTab changes
  useEffect(() => {
    const active = getActiveGroupId(currentTab);
    setOpenGroups(prev => ({
      ...prev,
      [active]: true
    }));
  }, [currentTab]);

  // Toggle group accordion under left main menu
  const toggleGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Hover Flyout state for mouseover dropdown
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarNavRef = useRef<HTMLDivElement>(null);

  const handleMouseEnterGroup = (groupId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutPosition({ top: Math.max(12, rect.top) });
    setHoveredGroupId(groupId);
  };

  const handleMouseLeaveGroup = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroupId(null);
      setFlyoutPosition(null);
    }, 180);
  };

  const handleFlyoutMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleFlyoutMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroupId(null);
      setFlyoutPosition(null);
    }, 180);
  };

  // Submenu item click execution
  const handleSubItemClick = (sub: NavSubItem) => {
    setHoveredGroupId(null);
    setFlyoutPosition(null);

    if (sub.action === 'sql_server') {
      onOpenSqlServer?.('connection');
      return;
    }
    if (sub.action === 'sql_server_ddl') {
      onOpenSqlServer?.('schema');
      return;
    }
    if (sub.action === 'backup_modal') {
      onOpenBackup();
      return;
    }
    if (sub.id === 'setup-pwa' || sub.route === 'pwa-sync') {
      setCurrentTab('pwa-sync');
      return;
    }
    if (sub.action === 'install_pwa') {
      setCurrentTab('pwa-sync');
      return;
    }
    if (sub.route) {
      setCurrentTab(sub.route);
    }
  };

  // Main group header click
  const handleGroupClick = (group: NavGroup) => {
    // If collapsed, toggle collapse to open
    if (isCollapsed) {
      onToggleCollapse();
      setOpenGroups(prev => ({ ...prev, [group.id]: true }));
    } else {
      // Toggle expansion under main menu
      toggleGroup(group.id);
    }

    // Also navigate to primary route if not already there
    if (group.primaryRoute && currentTab !== group.primaryRoute) {
      setCurrentTab(group.primaryRoute);
    }
  };

  const isSubItemActive = (sub: NavSubItem) => {
    if (!sub.route) return false;
    return currentTab === sub.route;
  };

  const isGroupActive = (group: NavGroup) => {
    return group.primaryRoute === currentTab || group.subItems.some(sub => sub.route === currentTab);
  };

  const hoveredGroup = visibleGroups.find(g => g.id === hoveredGroupId);

  return (
    <aside 
      className={`bg-[#0b2f35] text-slate-200 shrink-0 transition-all duration-200 flex flex-col z-40 select-none no-print border-r border-[#082429] relative ${
        isCollapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Top Logo Card */}
      <div className={`h-16 px-3.5 border-b border-[#0e3b43] flex items-center justify-between ${isCollapsed ? 'justify-center' : ''}`}>
        <DrBatrasLogo isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Menu */}
      <div 
        ref={sidebarNavRef}
        aria-label="Primary Main Menu" 
        className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
      >
        {visibleGroups.map(group => {
          const GroupIcon = group.icon;
          const active = isGroupActive(group);
          const isOpen = !!openGroups[group.id] && !isCollapsed;

          return (
            <div 
              key={group.id} 
              className="relative"
              onMouseEnter={(e) => handleMouseEnterGroup(group.id, e)}
              onMouseLeave={handleMouseLeaveGroup}
            >
              {/* Main Menu Item */}
              <div
                onClick={() => handleGroupClick(group)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  active 
                    ? 'bg-teal-700 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? `${group.title} (Hover for submenus)` : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GroupIcon className={`w-4 h-4 shrink-0 transition-transform ${
                    active ? 'text-teal-200' : 'text-slate-400 group-hover:text-teal-300'
                  }`} />
                  
                  {!isCollapsed && (
                    <span className="truncate tracking-tight font-medium text-xs">
                      {group.title}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => toggleGroup(group.id, e)}
                    className="p-0.5 text-slate-400 hover:text-white rounded transition-colors shrink-0"
                    title={isOpen ? 'Collapse Submenu' : 'Expand Submenu'}
                    aria-label={`Toggle ${group.title} Submenu`}
                  >
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-teal-300" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
                    )}
                  </button>
                )}
              </div>

              {/* Submenus Kept Directly Under Left Main Menu */}
              {!isCollapsed && isOpen && (
                <div className="mt-1 mb-1.5 ml-4 pl-3.5 border-l-2 border-teal-600/40 space-y-0.5 animate-in fade-in-50 duration-150">
                  {group.subItems.map(sub => {
                    const SubIcon = sub.icon;
                    const subActive = isSubItemActive(sub);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubItemClick(sub)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-left group ${
                          subActive 
                            ? 'bg-teal-600/90 text-white font-semibold shadow-2xs' 
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SubIcon className={`w-3.5 h-3.5 shrink-0 ${
                            subActive ? 'text-teal-100' : 'text-slate-400 group-hover:text-teal-200'
                          }`} />
                          <span className="truncate">{sub.title}</span>
                        </div>

                        {/* Badges */}
                        {sub.badge && (
                          <span className={`text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded shrink-0 ml-1.5 ${
                            sub.badge === 'Excel' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : sub.badge === 'Admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : sub.badge === 'DDL'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          }`}>
                            {sub.badge}
                          </span>
                        )}
                        {sub.badgeType === 'urgent' && (
                          <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded shrink-0 ml-1.5 bg-rose-500/25 text-rose-300 border border-rose-500/40">
                            Urgent
                          </span>
                        )}
                        {sub.action && !sub.badge && (
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Mouseover Dropdown Menu (Appears beside menu on mouseover) */}
      {hoveredGroup && flyoutPosition && (
        <div 
          className="fixed left-[72px] lg:left-[260px] w-72 bg-[#082429] text-white rounded-2xl shadow-2xl border border-teal-500/40 p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-100 backdrop-blur-md"
          style={{ 
            top: `${flyoutPosition.top}px`,
            // If sidebar is collapsed, position close to collapsed bar (74px)
            left: isCollapsed ? '74px' : '262px'
          }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          {/* Header of Mouseover Dropdown */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-teal-900/60 mb-2">
            <div className="p-1.5 bg-teal-800/80 rounded-lg text-teal-200">
              <hoveredGroup.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{hoveredGroup.title}</span>
                {hoveredGroup.adminOnly && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1 rounded">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-[10px] text-teal-200/70 truncate">
                Select a sub-menu to navigate
              </div>
            </div>
          </div>

          {/* Submenus List */}
          <div className="space-y-1">
            {hoveredGroup.subItems.map(sub => {
              const SubIcon = sub.icon;
              const subActive = isSubItemActive(sub);

              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubItemClick(sub)}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                    subActive 
                      ? 'bg-teal-700 text-white font-medium' 
                      : 'hover:bg-white/10 text-slate-200 hover:text-white'
                  }`}
                >
                  <SubIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    subActive ? 'text-teal-200' : 'text-teal-400 group-hover:text-teal-200'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold">{sub.title}</span>
                      {sub.badge && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {sub.badge}
                        </span>
                      )}
                      {sub.badgeType === 'urgent' && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
                          Urgent
                        </span>
                      )}
                    </div>
                    {sub.subtitle && (
                      <p className="text-[10px] text-slate-400 group-hover:text-slate-300 line-clamp-1 mt-0.5">
                        {sub.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Branding Info & Collapse Toggle */}
      <div className="p-3 border-t border-[#0e3b43] text-[10px] text-teal-400/70 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="font-mono">Enterprise v2.6.2</span>
            <span>Hospete · Hubballi</span>
          </>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
