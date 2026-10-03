import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Boxes,
  ShoppingBag, 
  Truck, 
  BarChart3, 
  Sliders, 
  Settings, 
  Rocket, 
  Server, 
  Database, 
  FileSpreadsheet, 
  Layers, 
  History, 
  Tags, 
  Code2, 
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Terminal
} from 'lucide-react';
import { UserRole } from '../types/erp';

export interface NavSubItem {
  id: string;
  title: string;
  subtitle?: string;
  route?: string; // existing tab identifier in App.tsx
  action?: 'backup_modal' | 'sql_server' | 'sql_server_ddl' | 'install_pwa';
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: string;
  badgeType?: 'default' | 'urgent' | 'info' | 'success';
}

export interface NavGroup {
  id: string;
  title: string;
  shortTitle?: string;
  primaryRoute: string; // Default tab when clicking top-level item
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string; // Tailwind color accent
  adminOnly?: boolean;
  subItems: NavSubItem[];
}

export const NAVIGATION_GROUPS: NavGroup[] = [
  // 1. Dashboard
  {
    id: 'dashboard',
    title: 'Dashboard',
    shortTitle: 'Dash',
    primaryRoute: 'dashboard',
    icon: LayoutDashboard,
    accentColor: 'teal',
    subItems: [
      {
        id: 'dash-main',
        title: 'Main Dashboard',
        subtitle: 'Today\'s sales, active orders, and multi-branch overview',
        route: 'dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'dash-sales',
        title: 'Sales Overview',
        subtitle: 'Today\'s counter billing, Cash and UPI split metrics',
        route: 'dashboard',
        icon: Receipt
      },
      {
        id: 'dash-stock',
        title: 'Inventory Summary',
        subtitle: 'Batch stock countdown, critical balances and reorder alerts',
        route: 'inventory',
        icon: Package
      },
      {
        id: 'dash-expiry',
        title: 'Expiry & Low Stock',
        subtitle: 'Batches expiring within 30 days and zero-stock alerts',
        route: 'inventory',
        icon: AlertTriangle,
        badgeType: 'urgent'
      },
      {
        id: 'dash-branches',
        title: 'Branch Performance',
        subtitle: 'Comparative KPIs for Hospete and Hubballi centers',
        route: 'dashboard',
        icon: Building2
      }
    ]
  },

  // 2. POS & Sales
  {
    id: 'pos',
    title: 'POS & Sales',
    shortTitle: 'POS',
    primaryRoute: 'pos',
    icon: Receipt,
    accentColor: 'blue',
    subItems: [
      {
        id: 'pos-billing',
        title: 'POS Billing',
        subtitle: 'Barcode scanning, FEFO auto-selection & instant billing',
        route: 'pos',
        icon: Receipt
      },
      {
        id: 'pos-history',
        title: 'Sales History',
        subtitle: 'Search historical receipts, customer bills & profit margins',
        route: 'reports',
        icon: FileText
      },
      {
        id: 'pos-reprint',
        title: 'Invoice Reprint',
        subtitle: 'Reprint thermal receipts with clinic GST details',
        route: 'dashboard',
        icon: CreditCard
      }
    ]
  },

  // 3. Inventory
  {
    id: 'inventory',
    title: 'Inventory',
    shortTitle: 'Stock',
    primaryRoute: 'inventory',
    icon: Package,
    accentColor: 'orange',
    subItems: [
      {
        id: 'inv-batches',
        title: 'Stock & Batches',
        subtitle: 'Granular batch tracking, expiry dates and location balances',
        route: 'inventory',
        icon: Package
      },
      {
        id: 'inv-opening',
        title: 'Opening Stock',
        subtitle: 'Upload live inventory from Excel (.xlsx) with pre-filled templates',
        route: 'opening-stock',
        icon: FileSpreadsheet,
        badge: 'Excel'
      },
      {
        id: 'inv-ledger',
        title: 'Movement Ledger',
        subtitle: 'Immutable chronological audit trail of all transactions',
        route: 'ledger',
        icon: History
      },
      {
        id: 'inv-expiry',
        title: 'Expiry Management',
        subtitle: 'Audit batches expiring in 30 days to prevent clinical waste',
        route: 'inventory',
        icon: Clock,
        badgeType: 'urgent'
      }
    ]
  },

  // 4. Products
  {
    id: 'products',
    title: 'Products',
    shortTitle: 'Products',
    primaryRoute: 'products',
    icon: Boxes,
    accentColor: 'purple',
    subItems: [
      {
        id: 'prod-catalog',
        title: 'Product Master',
        subtitle: 'SKU registry, HSN codes, GST rates, cost and selling prices',
        route: 'products',
        icon: Boxes
      },
      {
        id: 'prod-categories',
        title: 'Categories',
        subtitle: 'Hair Care, Skin Care, Body Care and Clinical Treatments',
        route: 'products',
        icon: Layers
      },
      {
        id: 'prod-brands',
        title: 'Brand Registry',
        subtitle: 'Dermatological brands, lab sources and supplier lines',
        route: 'products',
        icon: Tags
      },
      {
        id: 'prod-pricing',
        title: 'Price Management',
        subtitle: 'Switch between Active Batch Price (FEFO) and Master Price',
        action: 'backup_modal',
        icon: Sliders
      }
    ]
  },

  // 5. Procurement
  {
    id: 'procurement',
    title: 'Procurement',
    shortTitle: 'Procure',
    primaryRoute: 'inventory',
    icon: Truck,
    accentColor: 'emerald',
    subItems: [
      {
        id: 'proc-inward',
        title: 'Purchase Inward',
        subtitle: 'Log received supplier stock, invoices, and batch purchase rates',
        route: 'inventory',
        icon: Package
      },
      {
        id: 'proc-supplier-audit',
        title: 'Supplier Movement Log',
        subtitle: 'Filter and inspect purchase movement records in the ledger',
        route: 'ledger',
        icon: History
      }
    ]
  },

  // 6. Operations
  {
    id: 'operations',
    title: 'Operations',
    shortTitle: 'Ops',
    primaryRoute: 'delivery',
    icon: ArrowRightLeft,
    accentColor: 'rose',
    subItems: [
      {
        id: 'ops-delivery',
        title: 'Delivery Pipeline',
        subtitle: 'Track home delivery orders from Packing to Shipped & Delivered',
        route: 'delivery',
        icon: Truck
      },
      {
        id: 'ops-courier',
        title: 'Order Processing',
        subtitle: 'Manage BlueDart, DTDC, and SpeedPost tracking numbers',
        route: 'delivery',
        icon: Building2
      },
      {
        id: 'ops-branches',
        title: 'Branch Operations',
        subtitle: 'Consolidated counter activity for Hospete & Hubballi clinics',
        route: 'dashboard',
        icon: ArrowRightLeft
      }
    ]
  },

  // 7. Reports
  {
    id: 'reports',
    title: 'Reports',
    shortTitle: 'Reports',
    primaryRoute: 'reports',
    icon: BarChart3,
    accentColor: 'indigo',
    subItems: [
      {
        id: 'rep-sales',
        title: 'Sales Reports',
        subtitle: 'Daily counters, Cash vs UPI totals, and invoice breakdowns',
        route: 'reports',
        icon: Receipt
      },
      {
        id: 'rep-valuation',
        title: 'Inventory Valuation',
        subtitle: 'Stock balances evaluated at Cost Price and Selling Price',
        route: 'reports',
        icon: BarChart3
      },
      {
        id: 'rep-expiry',
        title: 'Expiry Report',
        subtitle: 'Near-expiry risk reports for pharmacy and treatment supplies',
        route: 'reports',
        icon: AlertTriangle
      },
      {
        id: 'rep-profit',
        title: 'Profit & Loss',
        subtitle: 'Gross margins and profit analysis per item, category, and branch',
        route: 'reports',
        icon: FileText
      }
    ]
  },

  // 8. Online Store
  {
    id: 'store',
    title: 'Online Store',
    shortTitle: 'Store',
    primaryRoute: 'store',
    icon: ShoppingBag,
    accentColor: 'violet',
    subItems: [
      {
        id: 'store-portal',
        title: 'Storefront',
        subtitle: 'Digital clinic store for patient self-ordering and pickup',
        route: 'store',
        icon: ShoppingBag
      },
      {
        id: 'store-orders',
        title: 'Orders',
        subtitle: 'Fulfill digital orders received through the online store',
        route: 'delivery',
        icon: Truck
      }
    ]
  },

  // 9. Setup & Tools
  {
    id: 'setup',
    title: 'Setup & Tools',
    shortTitle: 'Setup',
    primaryRoute: 'go-live',
    icon: Settings,
    accentColor: 'amber',
    adminOnly: true,
    subItems: [
      {
        id: 'setup-golive',
        title: 'System Reset / Go Live',
        subtitle: 'Wipe demo data, initialize live opening stock, reset sequences',
        route: 'go-live',
        icon: Rocket,
        adminOnly: true,
        badge: 'Admin'
      },
      {
        id: 'setup-ddl',
        title: 'Create SQL Database (DDL)',
        subtitle: 'Fetch latest production T-SQL script with all 17 objects & sequences',
        action: 'sql_server_ddl',
        icon: Code2,
        adminOnly: true,
        badge: 'DDL'
      },
      {
        id: 'setup-sqlserver',
        title: 'SQL Server & Cloud Suite',
        subtitle: 'Local port 1433 HTTP bridge, real-time trigger & Azure migration',
        action: 'sql_server',
        icon: Server,
        adminOnly: true,
        badge: 'Admin'
      },
      {
        id: 'setup-backup',
        title: 'Database Backup / Restore',
        subtitle: 'Export complete database snapshot or restore from JSON backup',
        action: 'backup_modal',
        icon: Database,
        adminOnly: true
      },
      {
        id: 'setup-pricing-mode',
        title: 'Pricing Rules',
        subtitle: 'Option A (Active FEFO Batch) vs Option B (Latest Product Price)',
        action: 'backup_modal',
        icon: Sliders,
        adminOnly: true
      },
      {
        id: 'setup-pwa',
        title: 'PWA / Offline Sync',
        subtitle: 'Install MediClinic ERP on Windows, macOS, Android or iOS tablet',
        route: 'pwa-sync',
        action: 'install_pwa',
        icon: Download
      },
      {
        id: 'setup-sql-studio',
        title: 'Live SQL Query Studio',
        subtitle: 'Execute any query & fetch data directly from DESKTOP-JN61NSF\\SQLEXPRESS',
        route: 'sql-studio',
        icon: Terminal,
        adminOnly: true
      }
    ]
  }
];

/**
 * Returns the active NavGroup given a tab id
 */
export function getActiveNavGroup(currentTab: string): NavGroup | undefined {
  return NAVIGATION_GROUPS.find(group => {
    if (group.primaryRoute === currentTab) return true;
    return group.subItems.some(item => item.route === currentTab);
  });
}

/**
 * Returns the human-readable breadcrumb trail for a tab
 */
export function getBreadcrumbTrail(currentTab: string): { groupTitle: string; itemTitle: string } {
  switch (currentTab) {
    case 'dashboard':
      return { groupTitle: 'Dashboard', itemTitle: 'Main Clinic Overview' };
    case 'pos':
      return { groupTitle: 'POS & Sales', itemTitle: 'Counter Billing' };
    case 'inventory':
      return { groupTitle: 'Inventory', itemTitle: 'Stock & Batches (FEFO)' };
    case 'opening-stock':
      return { groupTitle: 'Inventory', itemTitle: 'Opening Stock Importer' };
    case 'ledger':
      return { groupTitle: 'Inventory', itemTitle: 'Stock Movement Ledger' };
    case 'products':
      return { groupTitle: 'Products', itemTitle: 'Product Master Catalog' };
    case 'delivery':
      return { groupTitle: 'Operations', itemTitle: 'Patient Delivery Pipeline' };
    case 'reports':
      return { groupTitle: 'Reports', itemTitle: 'Sales, Stock & Valuation Reports' };
    case 'store':
      return { groupTitle: 'Online Store', itemTitle: 'Patient Online Storefront' };
    case 'go-live':
      return { groupTitle: 'Setup & Tools', itemTitle: 'Go-Live Management & DB Reset' };
    case 'pwa-sync':
      return { groupTitle: 'Setup & Tools', itemTitle: 'PWA & Offline Sync Management' };
    case 'sql-studio':
      return { groupTitle: 'Setup & Tools', itemTitle: 'Live SQL Query Studio & Data Fetch' };
    default:
      return { groupTitle: 'MediClinic ERP', itemTitle: currentTab };
  }
}
