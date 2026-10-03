import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  MapPin, 
  UserCheck, 
  LogOut, 
  Menu, 
  ChevronDown, 
  Bell, 
  AlertTriangle, 
  Truck, 
  X, 
  Check,
  Search,
  HelpCircle,
  Settings
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { DatabaseConnectionBadge } from './DatabaseConnectionBadge';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenBackup: () => void;
  onOpenSqlServer?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
  onOpenDrawer?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenPwaSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentTab, 
  setCurrentTab, 
  onOpenBackup, 
  onOpenSqlServer,
  onOpenDrawer,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenPwaSync
}) => {
  const {
    locations,
    selectedLocationId,
    setSelectedLocationId,
    currentUser,
    setCurrentUser,
    users,
    batches,
    onlineOrders,
    products,
    sales,
    logoutUser
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';

  // Notifications Popover State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Help Popover State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  // User Profile Dropdown State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Global Quick Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Critical batches (<30d) count
  const today = new Date('2026-09-26');
  const urgentBatches = useMemo(() => {
    return batches.filter(b => {
      if (selectedLocationId !== 'ALL' && b.locationId !== selectedLocationId) return false;
      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return b.currentQuantity > 0 && diffDays <= 30;
    });
  }, [batches, selectedLocationId]);

  // Active home deliveries count
  const activeDeliveries = useMemo(() => {
    return onlineOrders.filter(o => {
      if (currentUser.role !== 'Admin' && o.locationId !== currentUser.locationId) return false;
      if (currentUser.role === 'Admin' && selectedLocationId !== 'ALL' && o.locationId !== selectedLocationId) return false;
      return o.status === 'Pending' || o.status === 'Packed' || o.status === 'Shipped';
    });
  }, [onlineOrders, currentUser, selectedLocationId]);

  const totalNotifications = urgentBatches.length + activeDeliveries.length;

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsHelpOpen(false);
        setIsProfileMenuOpen(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Quick search results across products, invoices, batches
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return { products: [], invoices: [], batches: [] };

    const matchedProducts = products.filter(p => 
      p.productName.toLowerCase().includes(q) || 
      p.productCode.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedInvoices = sales.filter(s => 
      s.invoiceNo.toLowerCase().includes(q) || 
      s.customerName.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedBatches = batches.filter(b => 
      b.batchNumber.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      products: matchedProducts,
      invoices: matchedInvoices,
      batches: matchedBatches
    };
  }, [searchQuery, products, sales, batches]);

  const hasSearchResults = 
    searchResults.products.length > 0 || 
    searchResults.invoices.length > 0 || 
    searchResults.batches.length > 0;

  return (
    <div className="w-full bg-white select-none no-print border-b border-slate-200">
      
      {/* ========================================================================= */}
      {/* TOP UTILITY HEADER BAR                                                     */}
      {/* ========================================================================= */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
        
        {/* Left Section: Hamburger Menu + Global Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {/* Hamburger toggle for Sidebar / Mobile Drawer */}
          <button
            onClick={() => {
              if (onToggleSidebar) {
                onToggleSidebar();
              } else if (onOpenDrawer) {
                onOpenDrawer();
              }
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Navigation Sidebar"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Bar */}
          <div className="relative flex-1" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search products, customers, invoices, batches..."
                className="w-full pl-10 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Dropdown */}
            {isSearchFocused && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                {hasSearchResults ? (
                  <div className="space-y-3 text-xs">
                    {searchResults.products.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                          Products
                        </div>
                        <div className="divide-y divide-slate-50 pt-1">
                          {searchResults.products.map(p => (
                            <div 
                              key={p.productId}
                              onClick={() => {
                                setCurrentTab('products');
                                setIsSearchFocused(false);
                              }}
                              className="py-1.5 px-2 hover:bg-teal-50/60 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">{p.productName}</span>
                              <span className="font-mono text-slate-500">{p.productCode}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.invoices.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                          Invoices &amp; Receipts
                        </div>
                        <div className="divide-y divide-slate-50 pt-1">
                          {searchResults.invoices.map(s => (
                            <div 
                              key={s.saleId}
                              onClick={() => {
                                setCurrentTab('dashboard');
                                setIsSearchFocused(false);
                              }}
                              className="py-1.5 px-2 hover:bg-teal-50/60 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">{s.invoiceNo} · {s.customerName}</span>
                              <span className="font-mono font-bold text-teal-700">₹{s.netAmount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.batches.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                          Stock Batches
                        </div>
                        <div className="divide-y divide-slate-50 pt-1">
                          {searchResults.batches.map(b => (
                            <div 
                              key={b.batchId}
                              onClick={() => {
                                setCurrentTab('inventory');
                                setIsSearchFocused(false);
                              }}
                              className="py-1.5 px-2 hover:bg-teal-50/60 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">Batch #{b.batchNumber}</span>
                              <span className="font-mono text-slate-500">Qty: {b.currentQuantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    No matching records found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Branch Pill, Notification, Help, Settings, Profile, Install PWA, Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* 1. Branch Selector */}
          {isAdmin ? (
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-colors shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0 mr-1.5" />
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                aria-label="Select Clinic Location"
                title="Filter records by clinic location"
              >
                <option value="ALL">All Branches (Consolidated)</option>
                <option value="LOC-HOS">Hospete [HOS]</option>
                <option value="LOC-HUB">Hubballi [HUB]</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{locations.find(l => l.locationId === currentUser.locationId)?.locationCode || 'HOS'} Branch</span>
              <span className="text-[10px] font-normal text-slate-500">(Staff)</span>
            </div>
          )}

          {/* 2. Notifications Bell with Red Badge */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer relative shadow-2xs"
              aria-label="Operational Notifications"
              title={`Alerts: ${urgentBatches.length} expiring batches, ${activeDeliveries.length} active deliveries`}
            >
              <Bell className="w-4 h-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-[#e11d2a] text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center px-1 border-2 border-white shadow-xs">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-xs text-slate-900">Operational Notifications</span>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="py-2 space-y-2 text-xs">
                  {urgentBatches.length > 0 ? (
                    <div 
                      onClick={() => {
                        setCurrentTab('inventory');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{urgentBatches.length} Batches Expiring in &lt;30 Days</span>
                      </div>
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        Review stock batches and trigger FEFO discounts or returns.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-600 text-[11px] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All active stock batches have healthy shelf life.</span>
                    </div>
                  )}

                  {activeDeliveries.length > 0 && (
                    <div 
                      onClick={() => {
                        setCurrentTab('delivery');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2.5 bg-teal-50 hover:bg-teal-100/70 border border-teal-200 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 font-bold text-teal-900 text-xs">
                        <Truck className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>{activeDeliveries.length} Home Deliveries in Pipeline</span>
                      </div>
                      <p className="text-[11px] text-teal-800 mt-0.5">
                        Pending packing, courier assignment, or dispatch.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Help Icon */}
          <div className="relative" ref={helpRef}>
            <button
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="Help & Shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {isHelpOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">MediClinic Help &amp; Hotkeys</span>
                  <button onClick={() => setIsHelpOpen(false)} className="text-slate-400 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>POS Counter Billing</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">F2 / Alt+P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock &amp; Batches</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Alt+I</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Product Catalog</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Alt+C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SQL Server DDL</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Alt+S</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3.5 Database & Server Connection Badge */}
          <DatabaseConnectionBadge onOpenSqlServer={onOpenSqlServer} />

          {/* 4. Settings Gear Icon */}
          <button
            onClick={onOpenBackup}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="System Settings & Pricing Modes"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>

          {/* 5. User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title="Active User Profile"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-700 text-white font-black text-xs flex items-center justify-center">
                DR
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  👑 {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {currentUser.role === 'Admin' ? 'Administrator' : currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-xs">
                <div className="pb-2 border-b border-slate-100 mb-2">
                  <div className="font-bold text-slate-900">{currentUser.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">@{currentUser.username} · {locations.find(l => l.locationId === currentUser.locationId)?.locationCode || 'HOS'}</div>
                  <div className="text-[10px] text-teal-700 font-semibold mt-0.5">Role: {currentUser.role}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Switch Profile</div>
                  {users.map(u => (
                    <button
                      key={u.userId}
                      onClick={() => {
                        setCurrentUser(u);
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                        u.userId === currentUser.userId ? 'bg-teal-50 font-bold text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{u.fullName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6. Install PWA Button */}
          <div className="hidden sm:block">
            <PWAInstallButton onOpenPwaSync={onOpenPwaSync} />
          </div>

          {/* 7. Sign Out Button */}
          <button
            onClick={logoutUser}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#e11d2a] hover:bg-rose-50 border border-[#e11d2a]/50 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Sign Out of MediClinic Commerce ERP"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

        </div>

      </div>

    </div>
  );
};
