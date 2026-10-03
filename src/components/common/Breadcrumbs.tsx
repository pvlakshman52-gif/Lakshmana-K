import React from 'react';
import { ChevronRight, Home, MapPin, Sliders, Shield } from 'lucide-react';
import { getBreadcrumbTrail } from '../../config/navigationConfig';
import { useClinic } from '../../context/ClinicContext';

interface BreadcrumbsProps {
  currentTab: string;
  onNavigateHome: () => void;
  onOpenSettings?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentTab,
  onNavigateHome,
  onOpenSettings
}) => {
  const { selectedLocationId, locations, currentUser, batchPricingMode } = useClinic();
  const trail = getBreadcrumbTrail(currentTab);

  const activeLocation = locations.find(l => l.locationId === selectedLocationId);
  const locationLabel = selectedLocationId === 'ALL'
    ? 'All Branches (Consolidated)'
    : `${activeLocation?.locationName || activeLocation?.locationCode || 'Branch'}`;

  return (
    <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-slate-500 no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-0.5">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
            title="Return to Main Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </button>

          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

          <span className="font-medium text-slate-600">
            {trail.groupTitle}
          </span>

          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

          <span className="font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
            {trail.itemTitle}
          </span>
        </nav>

        {/* Operational Context Badges */}
        <div className="hidden md:flex items-center gap-2 shrink-0 text-[11px]">
          <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
            <MapPin className="w-3 h-3 text-teal-600" />
            <span>{locationLabel}</span>
          </span>

          {currentUser.role === 'Admin' && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono font-medium">
              <Shield className="w-3 h-3 text-amber-600" />
              <span>Admin Access</span>
            </span>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Pricing Mode: Active FEFO Batch Price vs Product Master Price"
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span className="font-mono text-[10px] text-slate-600">
                {batchPricingMode === 'ACTIVE_BATCH' ? 'FEFO Pricing' : 'Master Pricing'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
