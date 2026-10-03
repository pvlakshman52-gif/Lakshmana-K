import React, { useState } from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { Header } from './components/common/Header';
import { AppSidebar } from './components/common/AppSidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosBilling } from './components/pos/PosBilling';
import { StockBatchList } from './components/inventory/StockBatchList';
import { StockMovementLedgerView } from './components/ledger/StockMovementLedgerView';
import { ProductCatalog } from './components/products/ProductCatalog';
import { ReportsView } from './components/reports/ReportsView';
import { CustomerStorePortal } from './components/store/CustomerStorePortal';
import { PatientDeliveryPipeline } from './components/delivery/PatientDeliveryPipeline';
import { DatabaseBackupModal } from './components/admin/DatabaseBackupModal';
import { SqlServerManagerModal } from './components/admin/SqlServerManagerModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { OpeningStockView } from './components/inventory/OpeningStockView';
import { GoLiveManagement } from './components/admin/GoLiveManagement';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { NavigationDrawer } from './components/common/NavigationDrawer';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { PWAOfflineSyncModal } from './components/common/PWAOfflineSyncModal';
import { PWAOfflineSyncView } from './components/pwa/PWAOfflineSyncView';
import { SqlQueryStudioView } from './components/admin/SqlQueryStudioView';

const ClinicAppShell: React.FC = () => {
  const { isAuthenticated, logoutUser, currentUser } = useClinic();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isSqlServerModalOpen, setIsSqlServerModalOpen] = useState<boolean>(false);
  const [isPwaSyncModalOpen, setIsPwaSyncModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [sqlServerActiveTab, setSqlServerActiveTab] = useState<'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud'>('schema');
  const [isGuestStoreActive, setIsGuestStoreActive] = useState<boolean>(false);

  // If unauthenticated and not viewing store directly as guest, render LoginScreen
  if (!isAuthenticated && !isGuestStoreActive) {
    return (
      <LoginScreen
        onSuccess={() => {
          setIsGuestStoreActive(false);
          setCurrentTab('dashboard');
        }}
        onOpenStore={() => {
          setIsGuestStoreActive(true);
          setCurrentTab('store');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-teal-600 selection:text-white">
      
      {/* Collapsible Left Sidebar (Matching Image 1 reference) */}
      <AppSidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSqlServer={tab => {
          setSqlServerActiveTab(tab || 'schema');
          setIsSqlServerModalOpen(true);
        }}
        onOpenPwaSync={() => setCurrentTab('pwa-sync')}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header with Bar 1 (Utility) & Bar 2 (Module Tabs) & Mega Directory */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenSqlServer={tab => {
            setSqlServerActiveTab(tab || 'schema');
            setIsSqlServerModalOpen(true);
          }}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenPwaSync={() => setCurrentTab('pwa-sync')}
        />

        {/* Offline Status & Connection Loss Warning Banner */}
        <OfflineIndicator onOpenPwaSync={() => setCurrentTab('pwa-sync')} />

        {/* Main Content Viewport */}
        <main className="flex-1 pb-24 lg:pb-16 overflow-y-auto">
        {currentTab === 'dashboard' && (
          <DashboardView onNavigate={tab => setCurrentTab(tab)} />
        )}

        {currentTab === 'pos' && (
          <PosBilling />
        )}

        {currentTab === 'inventory' && (
          <StockBatchList onNavigateToOpeningStock={() => setCurrentTab('opening-stock')} />
        )}

        {currentTab === 'opening-stock' && (
          <OpeningStockView
            onNavigateToLedger={() => setCurrentTab('ledger')}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        )}

        {currentTab === 'ledger' && (
          <StockMovementLedgerView />
        )}

        {currentTab === 'products' && (
          <ProductCatalog />
        )}

        {currentTab === 'delivery' && (
          <PatientDeliveryPipeline
            onOpenStore={() => setCurrentTab('store')}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView />
        )}

        {currentTab === 'go-live' && (
          <GoLiveManagement
            onNavigateToOpeningStock={() => setCurrentTab('opening-stock')}
            onNavigateToPos={() => setCurrentTab('pos')}
            onNavigateToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'store' && (
          <CustomerStorePortal
            onBackToERP={() => {
              if (isAuthenticated) {
                setCurrentTab('dashboard');
              } else {
                setIsGuestStoreActive(false);
              }
            }}
          />
        )}

        {currentTab === 'pwa-sync' && (
          <PWAOfflineSyncView
            onNavigate={tab => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'sql-studio' && (
          <SqlQueryStudioView
            onNavigate={tab => setCurrentTab(tab)}
          />
        )}
      </main>

      {/* Database & Architecture Settings Modal */}
      {isBackupModalOpen && (
        <DatabaseBackupModal
          onClose={() => setIsBackupModalOpen(false)}
          onNavigateToGoLive={() => setCurrentTab('go-live')}
          onOpenSqlServerManager={(tab = 'schema') => {
            setSqlServerActiveTab(tab);
            setIsSqlServerModalOpen(true);
          }}
        />
      )}

      {/* SQL Server Database & Cloud Migration Suite Modal (Admin Only) */}
      {isSqlServerModalOpen && (
        <SqlServerManagerModal
          onClose={() => setIsSqlServerModalOpen(false)}
          defaultTab={sqlServerActiveTab}
          onNavigateToOpeningStock={() => setCurrentTab('opening-stock')}
        />
      )}

      {/* PWA Device Installation & Offline Sync Suite Modal */}
      <PWAOfflineSyncModal
        isOpen={isPwaSyncModalOpen}
        onClose={() => setIsPwaSyncModalOpen(false)}
        onNavigateToTab={tab => setCurrentTab(tab)}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">MediClinic Commerce ERP Lite</span>
            <span>·</span>
            <span>Hospete & Hubballi Branches</span>
            <span>·</span>
            <span>ASP.NET Core 8 & SQL Server Architecture</span>
          </div>
          <div className="flex items-center gap-3">
            {currentUser.role === 'Admin' && (
              <>
                <button
                  onClick={() => {
                    setSqlServerActiveTab('schema');
                    setIsSqlServerModalOpen(true);
                  }}
                  className="text-teal-800 hover:text-teal-950 font-bold transition-colors cursor-pointer"
                  title="Create SQL Database DDL and fetch latest script"
                >
                  ⚡ Create SQL Database (DDL)
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    setSqlServerActiveTab('connection');
                    setIsSqlServerModalOpen(true);
                  }}
                  className="text-teal-800 hover:text-teal-950 font-bold transition-colors cursor-pointer"
                >
                  🏢 SQL Server & Cloud Suite
                </button>
                <span>·</span>
              </>
            )}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Database Backup & Architecture
            </button>
            <span>·</span>
            {currentTab !== 'store' ? (
              <button
                onClick={() => setCurrentTab('store')}
                className="hover:text-teal-700 transition-colors font-medium text-teal-800"
              >
                Patient Online Storefront →
              </button>
            ) : (
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setCurrentTab('dashboard');
                  } else {
                    setIsGuestStoreActive(false);
                  }
                }}
                className="hover:text-teal-700 transition-colors font-medium text-teal-800"
              >
                ← Back to Clinic ERP
              </button>
            )}
            <span>·</span>
            <button
              onClick={() => {
                logoutUser();
                setIsGuestStoreActive(false);
              }}
              className="hover:text-rose-700 transition-colors font-semibold text-rose-800 cursor-pointer"
            >
              🔐 Sign Out / Login Screen
            </button>
          </div>
        </div>
      </footer>

      </div>

      {/* Mobile & Tablet Bottom Navigation Bar (44px+ touch targets, clean drawer) */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSqlServer={() => {
          setSqlServerActiveTab('schema');
          setIsSqlServerModalOpen(true);
        }}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Mobile & Tablet Full Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSqlServer={tab => {
          setSqlServerActiveTab(tab || 'schema');
          setIsSqlServerModalOpen(true);
        }}
        onOpenPwaSync={() => setIsPwaSyncModalOpen(true)}
      />

    </div>
  );
};

export default function App() {
  return (
    <ClinicProvider>
      <ClinicAppShell />
    </ClinicProvider>
  );
}
