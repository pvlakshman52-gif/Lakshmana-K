import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  ShoppingBag, 
  Menu, 
  X, 
  Truck, 
  BarChart3, 
  Layers, 
  ArrowRightLeft, 
  Tags, 
  Rocket, 
  Sliders, 
  LogOut,
  Download,
  Building2,
  Server
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenBackup: () => void;
  onOpenSqlServer?: () => void;
  onOpenDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  onOpenBackup,
  onOpenSqlServer,
  onOpenDrawer
}) => {
  const { currentUser, selectedLocationId, locations, onlineOrders, logoutUser } = useClinic();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Active home deliveries count
  const activeDeliveriesCount = onlineOrders.filter(o => {
    if (currentUser.role !== 'Admin' && o.locationId !== currentUser.locationId) return false;
    if (currentUser.role === 'Admin' && selectedLocationId !== 'ALL' && o.locationId !== selectedLocationId) return false;
    return o.status === 'Pending' || o.status === 'Packed' || o.status === 'Shipped';
  }).length;

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Primary Fixed Bottom Navigation Bar (Visible on mobile/tablet screens < lg) */}
      <nav 
        aria-label="Mobile Navigation" 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 flex items-center justify-around no-print"
      >
        {/* 1. Dashboard */}
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
            currentTab === 'dashboard'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Dashboard"
        >
          <div className={`p-1 rounded-lg ${currentTab === 'dashboard' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Dashboard</span>
        </button>

        {/* 2. POS Billing */}
        <button
          onClick={() => handleSelectTab('pos')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
            currentTab === 'pos'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="POS Counter Billing"
        >
          <div className={`p-1 rounded-lg ${currentTab === 'pos' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">POS Bill</span>
        </button>

        {/* 3. Stock Batches */}
        <button
          onClick={() => handleSelectTab('inventory')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
            currentTab === 'inventory'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Inventory Batches"
        >
          <div className={`p-1 rounded-lg ${currentTab === 'inventory' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Batches</span>
        </button>

        {/* 4. Online Store */}
        <button
          onClick={() => handleSelectTab('store')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all ${
            currentTab === 'store'
              ? 'text-indigo-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Patient Online Store"
        >
          <div className={`p-1 rounded-lg ${currentTab === 'store' ? 'bg-indigo-50 text-indigo-700' : ''}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Store</span>
        </button>

        {/* 5. More Menu Sheet Trigger */}
        <button
          onClick={() => {
            if (onOpenDrawer) {
              onOpenDrawer();
            } else {
              setIsMoreMenuOpen(true);
            }
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative ${
            isMoreMenuOpen || ['delivery', 'reports', 'products', 'opening-stock', 'ledger', 'go-live'].includes(currentTab)
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="More Menu"
        >
          <div className={`p-1 rounded-lg relative ${['delivery', 'reports', 'products', 'opening-stock', 'ledger', 'go-live'].includes(currentTab) ? 'bg-teal-50 text-teal-700' : ''}`}>
            <Menu className="w-5 h-5" />
            {activeDeliveriesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </nav>

      {/* Slide-Up Full Drawer for "More" Operations on Mobile */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl space-y-4 border-t border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Clinic Navigation & Modules</h3>
                <p className="text-xs text-slate-500">
                  {currentUser.fullName} · {currentUser.role} ({locations.find(l => l.locationId === currentUser.locationId)?.locationCode || 'HOS'} Branch)
                </p>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Install App Banner in Drawer */}
            <div 
              onClick={() => handleSelectTab('pwa-sync')}
              className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 flex items-center justify-between cursor-pointer hover:bg-teal-100/50 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>PWA &amp; Offline Sync Suite</span>
                </div>
                <p className="text-[11px] text-teal-800">Tap to open PWA &amp; offline management</p>
              </div>
              <PWAInstallButton compact={true} onOpenPwaSync={() => handleSelectTab('pwa-sync')} />
            </div>

            {/* Grid of Modules */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={() => handleSelectTab('pwa-sync')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'pwa-sync'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-teal-100 text-teal-800 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">PWA / Offline</div>
                  <div className="text-[11px] text-slate-500">Cache &amp; sync console</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('delivery')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'delivery'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-teal-100 text-teal-800 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">Home Delivery</div>
                  <div className="text-[11px] text-slate-500">
                    {activeDeliveriesCount > 0 ? `${activeDeliveriesCount} pending orders` : 'Patient pipeline'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('reports')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'reports'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">Reports & Audit</div>
                  <div className="text-[11px] text-slate-500">Sales, stock & profit</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('products')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'products'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                  <Tags className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">Product Master</div>
                  <div className="text-[11px] text-slate-500">SKUs & categories</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('opening-stock')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'opening-stock'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">Opening Stock</div>
                  <div className="text-[11px] text-slate-500">Batch initialization</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('ledger')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  currentTab === 'ledger'
                    ? 'border-teal-500 bg-teal-50 text-teal-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate">Stock Ledger</div>
                  <div className="text-[11px] text-slate-500">Movement audit log</div>
                </div>
              </button>

              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => handleSelectTab('go-live')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    currentTab === 'go-live'
                      ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                      : 'border-amber-200 hover:bg-amber-50 text-amber-900'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold truncate">Go Live Reset</div>
                    <div className="text-[11px] text-amber-700">Admin system launch</div>
                  </div>
                </button>
              )}

              {currentUser.role === 'Admin' && onOpenSqlServer && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenSqlServer();
                  }}
                  className="p-3 rounded-xl border border-teal-300 bg-teal-50 text-teal-950 font-bold text-left flex items-start gap-2.5 transition-all cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold truncate">SQL Server Suite</div>
                    <div className="text-[11px] text-teal-700">Database & Cloud</div>
                  </div>
                </button>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenBackup();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-700" />
                <span>Admin Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  logoutUser();
                }}
                className="py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
