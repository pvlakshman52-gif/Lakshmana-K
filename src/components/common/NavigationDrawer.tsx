import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  UserCheck, 
  LogOut, 
  Sliders, 
  Server, 
  Download, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Home
} from 'lucide-react';
import { NAVIGATION_GROUPS, NavGroup, NavSubItem } from '../../config/navigationConfig';
import { useClinic } from '../../context/ClinicContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenBackup: () => void;
  onOpenSqlServer?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
  onOpenPwaSync?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenBackup,
  onOpenSqlServer,
  onOpenPwaSync
}) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    locations,
    selectedLocationId,
    setSelectedLocationId,
    batches,
    onlineOrders,
    logoutUser,
    batchPricingMode
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion expanded state for each group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAVIGATION_GROUPS.forEach(g => {
      // Default expand active group or first few
      const hasActive = g.primaryRoute === currentTab || g.subItems.some(i => i.route === currentTab);
      init[g.id] = hasActive || g.id === 'inventory' || g.id === 'pos';
    });
    return init;
  });

  // Calculate critical alerts count (expired or <30d)
  const today = new Date('2026-09-26');
  const urgentCount = batches.filter(b => {
    if (selectedLocationId !== 'ALL' && b.locationId !== selectedLocationId) return false;
    const exp = new Date(b.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return b.currentQuantity > 0 && diffDays <= 30;
  }).length;

  // Active home deliveries count
  const activeDeliveriesCount = onlineOrders.filter(o => {
    if (currentUser.role !== 'Admin' && o.locationId !== currentUser.locationId) return false;
    if (currentUser.role === 'Admin' && selectedLocationId !== 'ALL' && o.locationId !== selectedLocationId) return false;
    return o.status === 'Pending' || o.status === 'Packed' || o.status === 'Shipped';
  }).length;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleItemClick = (item: NavSubItem) => {
    if (item.action === 'backup_modal') {
      onOpenBackup();
      onClose();
      return;
    }
    if (item.action === 'sql_server') {
      onOpenSqlServer?.('connection');
      onClose();
      return;
    }
    if (item.action === 'sql_server_ddl') {
      onOpenSqlServer?.('schema');
      onClose();
      return;
    }
    if (item.id === 'setup-pwa' || item.route === 'pwa-sync') {
      onSelectTab('pwa-sync');
      onClose();
      return;
    }
    if (item.action === 'install_pwa') {
      onSelectTab('pwa-sync');
      onClose();
      return;
    }
    if (item.route) {
      onSelectTab(item.route);
      onClose();
    }
  };

  // Filter navigation groups based on search
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return NAVIGATION_GROUPS.filter(g => !g.adminOnly || isAdmin);
    }
    return NAVIGATION_GROUPS.filter(g => !g.adminOnly || isAdmin)
      .map(group => {
        const groupMatch = group.title.toLowerCase().includes(q);
        const matchedItems = group.subItems.filter(item => {
          if (item.adminOnly && !isAdmin) return false;
          return (
            groupMatch ||
            item.title.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q))
          );
        });
        return {
          ...group,
          subItems: matchedItems
        };
      })
      .filter(g => g.subItems.length > 0);
  }, [searchQuery, isAdmin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Dimmed Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300">
          
          {/* Header Zone: Brand & Close */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                MC
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">MediClinic ERP</h2>
                <p className="text-[11px] text-teal-300">Navigation & Enterprise Menu</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Navigation Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Context Bar: Location & User Role */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
            {/* Location Switcher */}
            {isAdmin ? (
              <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <MapPin className="w-4 h-4 ml-2 text-teal-600 shrink-0" />
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-hidden py-1.5 pl-1.5 pr-2 cursor-pointer"
                  aria-label="Select Clinic Location"
                >
                  <option value="ALL">🌐 All Branches (Consolidated)</option>
                  <option value="LOC-HOS">📍 Hospete Branch [HOS]</option>
                  <option value="LOC-HUB">📍 Hubballi Branch [HUB]</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold shadow-2xs">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{locations.find(l => l.locationId === currentUser.locationId)?.locationName || 'Assigned Branch'}</span>
                <span className="text-[10px] font-normal text-slate-500 ml-auto">(Staff Locked)</span>
              </div>
            )}

            {/* User Switcher */}
            <div className="flex items-center justify-between gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 ml-1 text-slate-500 shrink-0" />
                <span className="truncate font-medium text-slate-800">
                  {currentUser.fullName}
                </span>
              </div>
              <select
                value={currentUser.userId}
                onChange={e => {
                  const u = users.find(x => x.userId === e.target.value);
                  if (u) setCurrentUser(u);
                }}
                className="bg-slate-100 text-[11px] font-semibold text-slate-700 rounded px-2 py-1 focus:outline-hidden cursor-pointer"
                aria-label="Switch User Profile"
              >
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.role === 'Admin' ? '👑 Admin' : u.fullName.split(' ')[0] + ' (' + u.role + ')'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Filter Box */}
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search screens (e.g. POS, Stock, Reports)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-hidden focus:bg-white focus:border-teal-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Accordions Body (Scrollable) */}
          <nav aria-label="Mobile Navigation Groups" className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {filteredGroups.map(group => {
              const GroupIcon = group.icon;
              const isGroupActive = group.primaryRoute === currentTab || group.subItems.some(i => i.route === currentTab);
              const isExpanded = !!expandedGroups[group.id] || searchQuery.length > 0;

              return (
                <div 
                  key={group.id} 
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isGroupActive 
                      ? 'border-teal-300 bg-teal-50/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Group Accordion Header (Min 44px touch target) */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isGroupActive 
                          ? 'bg-teal-700 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold text-sm ${isGroupActive ? 'text-teal-950 font-bold' : 'text-slate-800'}`}>
                        {group.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {group.id === 'inventory' && urgentCount > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                          {urgentCount} Expiring
                        </span>
                      )}
                      {group.id === 'operations' && activeDeliveriesCount > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full">
                          {activeDeliveriesCount} Active
                        </span>
                      )}
                      {group.adminOnly && (
                        <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded uppercase">
                          Admin
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </button>

                  {/* Submenu Items List */}
                  {isExpanded && (
                    <div className="px-2 pb-2 pt-1 border-t border-slate-100 space-y-1">
                      {group.subItems.map(item => {
                        const ItemIcon = item.icon;
                        const isItemActive = item.route === currentTab;

                        if (item.adminOnly && !isAdmin) return null;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-lg flex items-start gap-2.5 text-left transition-all cursor-pointer ${
                              isItemActive
                                ? 'bg-teal-700 text-white font-semibold shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <ItemIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`text-xs ${isItemActive ? 'text-white font-bold' : 'text-slate-900 font-medium'}`}>
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                    isItemActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-teal-100 text-teal-900'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className={`text-[10px] line-clamp-1 mt-0.5 ${
                                  isItemActive ? 'text-teal-100' : 'text-slate-500'
                                }`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Drawer Footer Actions */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenBackup();
                  onClose();
                }}
                className="min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-medium flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Sliders className="w-4 h-4 text-teal-700" />
                <span>Settings</span>
              </button>

              {isAdmin && onOpenSqlServer && (
                <button
                  onClick={() => {
                    onOpenSqlServer('schema');
                    onClose();
                  }}
                  className="min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-teal-900 font-medium flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Server className="w-4 h-4 text-teal-700" />
                  <span>SQL Server</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <PWAInstallButton />

              <button
                onClick={() => {
                  logoutUser();
                  onClose();
                }}
                className="min-h-[44px] px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
