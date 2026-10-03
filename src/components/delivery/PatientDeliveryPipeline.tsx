import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { OnlineOrder, DeliveryStatus } from '../../types/erp';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Search, 
  Printer, 
  Filter, 
  ShieldCheck, 
  ArrowRight, 
  Edit3, 
  User, 
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Send,
  Settings
} from 'lucide-react';
import { CourierSettings } from '../../types/erp';

interface PatientDeliveryPipelineProps {
  onOpenStore?: () => void;
}

export const PatientDeliveryPipeline: React.FC<PatientDeliveryPipelineProps> = ({ onOpenStore }) => {
  const { 
    onlineOrders, 
    locations, 
    selectedLocationId, 
    setSelectedLocationId, 
    currentUser, 
    updateOnlineOrderStatus,
    updateOnlineOrderDeliveryInfo,
    courierSettings,
    updateCourierSettings
  } = useClinic();

  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForChallan, setSelectedOrderForChallan] = useState<OnlineOrder | null>(null);

  // Admin Courier Settings Modal
  const [isCourierSettingsModalOpen, setIsCourierSettingsModalOpen] = useState(false);
  const [tempCourierSettings, setTempCourierSettings] = useState<CourierSettings>(() => ({ ...courierSettings }));

  // Editing dispatch modal or drawer
  const [editingOrder, setEditingOrder] = useState<OnlineOrder | null>(null);
  const [editAgent, setEditAgent] = useState('');
  const [editTrackingNo, setEditTrackingNo] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<DeliveryStatus>('Pending');
  const [editCourierCharge, setEditCourierCharge] = useState<number>(0);

  // Determine branch access:
  // If user is not Admin, clinic staff can strictly see orders for their assigned branch.
  // If Admin, can filter by selected branch or view ALL.
  const isClinicStaff = currentUser.role !== 'Admin';
  const staffBranchId = isClinicStaff ? currentUser.locationId : selectedLocationId;

  // Filter orders according to clinic staff location and search query
  const filteredOrders = useMemo(() => {
    return onlineOrders.filter(order => {
      // 1. Clinic staff access rule: clinic staff can see their branch's orders
      if (isClinicStaff) {
        if (order.locationId !== currentUser.locationId) return false;
      } else {
        // Admin: respect selectedLocationId if not ALL
        if (selectedLocationId !== 'ALL' && order.locationId !== selectedLocationId) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // 3. Search query (orderId, customerName, phone, address, trackingNumber)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = order.orderId.toLowerCase().includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.phone.includes(q);
        const matchesAddress = order.shippingAddress.toLowerCase().includes(q);
        const matchesTracking = (order.trackingNumber || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesAddress && !matchesTracking) {
          return false;
        }
      }

      return true;
    });
  }, [onlineOrders, isClinicStaff, currentUser, selectedLocationId, statusFilter, searchQuery]);

  // Status stage counts for the staff's accessible branch scope
  const stageCounts = useMemo(() => {
    const baseOrders = onlineOrders.filter(order => {
      if (isClinicStaff) {
        return order.locationId === currentUser.locationId;
      }
      if (selectedLocationId !== 'ALL') {
        return order.locationId === selectedLocationId;
      }
      return true;
    });

    return {
      all: baseOrders.length,
      pending: baseOrders.filter(o => o.status === 'Pending').length,
      packed: baseOrders.filter(o => o.status === 'Packed').length,
      shipped: baseOrders.filter(o => o.status === 'Shipped').length,
      delivered: baseOrders.filter(o => o.status === 'Delivered').length,
    };
  }, [onlineOrders, isClinicStaff, currentUser, selectedLocationId]);

  const openDispatchEditor = (order: OnlineOrder) => {
    setEditingOrder(order);
    setEditAgent(order.deliveryAgent || 'DTDC Express');
    setEditTrackingNo(order.trackingNumber || '');
    setEditNotes(order.trackingNotes || '');
    setEditStatus(order.status);
    setEditCourierCharge(order.courierCharges ?? 0);
  };

  const saveDispatchDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    updateOnlineOrderDeliveryInfo(editingOrder.orderId, {
      status: editStatus,
      deliveryAgent: editAgent,
      trackingNumber: editTrackingNo,
      trackingNotes: editNotes,
      courierCharges: Number(editCourierCharge) || 0
    });

    setEditingOrder(null);
  };

  const handleQuickStatusTransition = (order: OnlineOrder, newStatus: DeliveryStatus) => {
    updateOnlineOrderStatus(order.orderId, newStatus);
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Dispatch</span>
          </span>
        );
      case 'Packed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
            <Package className="w-3 h-3 text-blue-600" />
            <span>Packed & Verified</span>
          </span>
        );
      case 'Shipped':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1">
            <Truck className="w-3 h-3 text-purple-600" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'Delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
    }
  };

  const staffBranch = locations.find(l => l.locationId === (isClinicStaff ? currentUser.locationId : selectedLocationId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Live Patient Home Delivery & Order Pipeline</span>
              </h1>
              <p className="text-xs text-slate-500">
                End-to-end clinical prescription packaging, courier dispatch, and patient delivery pipeline.
              </p>
            </div>
          </div>
        </div>

        {/* Staff Branch Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Fulfillment Depot</div>
            <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {isClinicStaff 
                  ? `${staffBranch?.locationName} (${staffBranch?.locationCode}) — Staff View`
                  : selectedLocationId === 'ALL'
                  ? 'All Clinic Depots (Admin Consolidated)'
                  : `${staffBranch?.locationName} (${staffBranch?.locationCode})`}
              </span>
            </div>
          </div>

          {currentUser.role === 'Admin' && (
            <button
              onClick={() => {
                setTempCourierSettings({ ...courierSettings });
                setIsCourierSettingsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              title="Configure global courier charges and depot rules"
            >
              <Settings className="w-4 h-4 text-teal-700" />
              <span>Admin Courier Rates</span>
            </button>
          )}

          {onOpenStore && (
            <button
              onClick={onOpenStore}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold rounded-xl text-xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-700" />
              <span>Patient Online Store →</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Notice & Security Card */}
      <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
          <div className="text-teal-950">
            <span className="font-bold">Access Control Architecture: </span>
            {isClinicStaff ? (
              <span>
                You are logged in as <strong>{currentUser.fullName} ({currentUser.role})</strong>. You can view and manage home delivery orders exclusively for <strong>{staffBranch?.locationCode} Clinic</strong>.
              </span>
            ) : (
              <span>
                You are logged in as <strong>👑 Admin ({currentUser.fullName})</strong> with multi-branch dispatch authority. Switch depots using the branch filter.
              </span>
            )}
            <span className="text-teal-800 block text-[11px] mt-0.5">
              🔐 <em>Customer privacy: Patients logging into the online store can only view their own orders.</em>
            </span>
          </div>
        </div>

        {!isClinicStaff && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-teal-800 font-semibold">Filter Depot:</span>
            <select
              value={selectedLocationId}
              onChange={e => setSelectedLocationId(e.target.value)}
              className="bg-white border border-teal-300 text-slate-800 text-xs rounded-lg py-1 px-2 font-medium"
            >
              <option value="ALL">All Clinic Depots</option>
              <option value="LOC-HOS">Hospete Clinic [HOS]</option>
              <option value="LOC-HUB">Hubballi Clinic [HUB]</option>
            </select>
          </div>
        )}
      </div>

      {/* Pipeline 4-Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">All Pipeline Orders</div>
          <div className="text-2xl font-bold font-mono mt-1">{stageCounts.all}</div>
          <div className="text-[10px] opacity-70 mt-1">Total in system</div>
        </button>

        <button
          onClick={() => setStatusFilter('Pending')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Pending'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-amber-900 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>1. Pending</span>
            <Clock className="w-3.5 h-3.5 opacity-80" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{stageCounts.pending}</div>
          <div className="text-[10px] opacity-80 mt-1">Awaiting Packing</div>
        </button>

        <button
          onClick={() => setStatusFilter('Packed')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Packed'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-blue-900 border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>2. Packed</span>
            <Package className="w-3.5 h-3.5 opacity-80" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{stageCounts.packed}</div>
          <div className="text-[10px] opacity-80 mt-1">Ready for Courier</div>
        </button>

        <button
          onClick={() => setStatusFilter('Shipped')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Shipped'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white text-purple-900 border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>3. Out for Delivery</span>
            <Truck className="w-3.5 h-3.5 opacity-80" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{stageCounts.shipped}</div>
          <div className="text-[10px] opacity-80 mt-1">In Transit / Courier</div>
        </button>

        <button
          onClick={() => setStatusFilter('Delivered')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'Delivered'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-emerald-900 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>4. Delivered</span>
            <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{stageCounts.delivered}</div>
          <div className="text-[10px] opacity-80 mt-1">Successfully Handed</div>
        </button>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Patient name, phone, order ID, or tracking #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <span className="text-slate-500 text-[11px]">
            Showing <strong>{filteredOrders.length}</strong> patient orders
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-teal-700 hover:underline text-[11px] font-semibold"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Order Pipeline List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-1" />
            <h3 className="font-bold text-sm text-slate-800">No Patient Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are no home delivery orders matching the selected status or clinic filter. New orders placed by patients online will immediately appear here for your clinic staff.
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const loc = locations.find(l => l.locationId === order.locationId);
            const stages: DeliveryStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered'];
            const currentStageIdx = stages.indexOf(order.status);

            return (
              <div
                key={order.orderId}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                {/* Header row */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {order.orderId}
                    </span>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{order.customerName}</span>
                    </div>
                    <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      +91 {order.phone}
                    </span>

                    {/* WhatsApp Patient Direct Connect */}
                    <a
                      href={`https://wa.me/91${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${order.customerName}, this is MediClinic (${loc?.locationName}). Regarding your home delivery order ${order.orderId}: Status is currently ${order.status}. Tracking: ${order.trackingNumber || 'Processing'}. Total: ₹${order.totalAmount}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Send WhatsApp update to patient"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp Patient</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Fulfilling depot pill */}
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-600" />
                      <span>{loc?.locationCode} Clinic Depot</span>
                    </span>

                    {/* Status badge */}
                    {getStatusBadge(order.status)}

                    {/* Printable Challan button */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForChallan(order)}
                      title="Print parcel packing challan"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pipeline Visual Stepper Bar */}
                <div className="px-5 py-3 bg-white border-b border-slate-100">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 font-semibold text-slate-500">
                    <span>Clinical Pipeline Progression:</span>
                    <span className="text-teal-800 font-mono">
                      Step {currentStageIdx + 1} of 4: {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 relative">
                    {stages.map((st, idx) => {
                      const isDone = currentStageIdx >= idx;
                      const isCurrent = order.status === st;

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickStatusTransition(order, st)}
                          className={`p-2 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                            isCurrent
                              ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                              : isDone
                              ? 'bg-teal-50/80 text-teal-950 border-teal-200 hover:bg-teal-100/70'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                            {isDone && <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-teal-700'}`} />}
                          </div>
                          <span className={`text-[11px] font-bold leading-tight ${isCurrent ? 'text-white' : ''}`}>
                            {st === 'Pending' ? 'New Order' : st === 'Packed' ? 'Prescription Packed' : st === 'Shipped' ? 'Dispatched / In Transit' : 'Delivered'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content body */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  
                  {/* Column 1: Prescribed Formulations */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      Prescribed Formulations ({order.items.length} items)
                    </span>
                    <div className="space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ₹{item.price} × {item.quantity} unit(s)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-800">
                            ₹{item.price * item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Itemized Bill Breakdown */}
                    <div className="pt-2 border-t border-slate-200 font-mono space-y-1">
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span className="font-sans">Formulations Subtotal:</span>
                        <span>₹{order.itemsTotal ?? order.items.reduce((s, it) => s + it.price * it.quantity, 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-teal-800 font-semibold">
                        <span className="font-sans flex items-center gap-1">
                          <Truck className="w-3 h-3 text-teal-600" />
                          <span>Courier Charges:</span>
                        </span>
                        <span>
                          {order.courierCharges !== undefined && order.courierCharges > 0 
                            ? `+₹${order.courierCharges}` 
                            : 'FREE / Waived'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="font-sans font-semibold text-slate-700">Total Bill Value:</span>
                        <span className="text-sm font-bold text-slate-900">₹{order.totalAmount}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Payment Mode:</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        order.paymentMethod === 'UPI Online'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {order.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Patient Shipping Address & Contact */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block">
                      Patient Delivery Address
                    </span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <div>{order.shippingAddress}</div>
                          {order.email && (
                            <div className="text-[11px] text-slate-500 mt-1">Email: {order.email}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      <span>Order Placed: </span>
                      <strong className="text-slate-700">
                        {new Date(order.orderDate).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* Column 3: Courier Tracking & Dispatch Note */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold text-slate-400">
                        Courier & Dispatch Tracking
                      </span>
                      <button
                        type="button"
                        onClick={() => openDispatchEditor(order)}
                        className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Dispatch</span>
                      </button>
                    </div>

                    <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-teal-800 font-medium">Courier / Agent:</span>
                        <span className="font-bold text-slate-900">
                          {order.deliveryAgent || 'Not Assigned Yet'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-teal-800 font-medium">AWB / Tracking #:</span>
                        <span className="font-mono font-bold text-teal-950 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                          {order.trackingNumber || 'Pending Dispatch'}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-teal-200/60">
                        <span className="text-[10px] text-teal-800 uppercase font-bold block mb-0.5">
                          Staff Dispatch Note
                        </span>
                        <p className="text-[11px] text-slate-700 font-mono">
                          {order.trackingNotes || 'No notes added yet.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stage Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {order.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusTransition(order, 'Packed')}
                          className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Mark as Packed & Verified</span>
                        </button>
                      )}

                      {order.status === 'Packed' && (
                        <button
                          type="button"
                          onClick={() => openDispatchEditor(order)}
                          className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch / Hand to Courier</span>
                        </button>
                      )}

                      {order.status === 'Shipped' && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusTransition(order, 'Delivered')}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Patient Delivery</span>
                        </button>
                      )}

                      {order.status === 'Delivered' && (
                        <div className="w-full py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivered to Patient</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Editor Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Update Delivery Dispatch & Tracking</h3>
                <p className="text-xs text-teal-100 font-mono">{editingOrder.orderId} · {editingOrder.customerName}</p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveDispatchDetails} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pipeline Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as DeliveryStatus)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="Pending">Pending (New Order)</option>
                  <option value="Packed">Packed (Prescription Verified)</option>
                  <option value="Shipped">Shipped (Dispatched / Out for Delivery)</option>
                  <option value="Delivered">Delivered (Handed to Patient)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Courier / Delivery Agent</label>
                  <input
                    type="text"
                    value={editAgent}
                    onChange={e => setEditAgent(e.target.value)}
                    placeholder="e.g. DTDC Express, Delhivery, Clinic Runner"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AWB / Tracking Number</label>
                  <input
                    type="text"
                    value={editTrackingNo}
                    onChange={e => setEditTrackingNo(e.target.value)}
                    placeholder="e.g. DTDC-881920"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispatch / Tracking Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="e.g. Handed to DTDC Hubballi driver at 4:30 PM. Expected delivery within 24 hours."
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              {/* Admin / Staff Courier Charges Control */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Courier Charges for this Order (₹)</span>
                  </span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold uppercase">
                    Admin Handled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editCourierCharge}
                    onChange={e => setEditCourierCharge(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 bg-white border border-teal-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setEditCourierCharge(0)}
                    className="px-2.5 py-2 bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs cursor-pointer"
                  >
                    Waive (₹0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCourierCharge(courierSettings?.standardCourierCharge || 50)}
                    className="px-2.5 py-2 bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs cursor-pointer"
                  >
                    Std (₹{courierSettings?.standardCourierCharge || 50})
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between pt-1 border-t border-teal-200/50">
                  <span>
                    Items: ₹{editingOrder.itemsTotal ?? editingOrder.items.reduce((s, it) => s + it.price * it.quantity, 0)} + Courier: ₹{editCourierCharge}
                  </span>
                  <span className="font-bold text-teal-950">
                    Updated Bill Total: ₹{(editingOrder.itemsTotal ?? editingOrder.items.reduce((s, it) => s + it.price * it.quantity, 0)) + Number(editCourierCharge)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                <div className="font-semibold text-slate-800">Patient Delivery Address:</div>
                <div>{editingOrder.shippingAddress}</div>
                <div>Phone: +91 {editingOrder.phone}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Save Dispatch Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Challan & Dispatch Slip Modal */}
      {selectedOrderForChallan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm">Delivery Challan & Dispatch Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs"
                >
                  Print Challan
                </button>
                <button
                  onClick={() => setSelectedOrderForChallan(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans print:p-0">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                <h2 className="text-base font-black tracking-wide uppercase text-slate-900">
                  MediClinic Retail & Derma Pharmacy
                </h2>
                <p className="text-[11px] text-slate-600">
                  {locations.find(l => l.locationId === selectedOrderForChallan.locationId)?.locationName}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {locations.find(l => l.locationId === selectedOrderForChallan.locationId)?.address} · Tel: {locations.find(l => l.locationId === selectedOrderForChallan.locationId)?.phone}
                </p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-slate-100 border border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  Prescription Parcel Delivery Challan
                </div>
              </div>

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Consignee</span>
                  <div className="font-bold text-sm text-slate-900">{selectedOrderForChallan.customerName}</div>
                  <div className="text-slate-700 mt-0.5">{selectedOrderForChallan.shippingAddress}</div>
                  <div className="font-mono text-slate-800 mt-1 font-semibold">📞 +91 {selectedOrderForChallan.phone}</div>
                </div>

                <div className="text-right space-y-1 font-mono">
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Challan # / Order: </span>
                    <strong className="text-slate-900">{selectedOrderForChallan.orderId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Order Date: </span>
                    <span>{new Date(selectedOrderForChallan.orderDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Payment Mode: </span>
                    <span className="font-bold font-sans">{selectedOrderForChallan.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Courier: </span>
                    <span>{selectedOrderForChallan.deliveryAgent || 'Clinic Direct Dispatch'}</span>
                  </div>
                  {selectedOrderForChallan.trackingNumber && (
                    <div>
                      <span className="text-slate-500 font-sans text-[10px]">AWB: </span>
                      <span className="font-bold">{selectedOrderForChallan.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product items table */}
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Prescribed Formulation</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Price</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedOrderForChallan.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-900">{it.productName}</td>
                        <td className="py-2 px-2 text-center font-bold">{it.quantity}</td>
                        <td className="py-2 px-2 text-right">₹{it.price}</td>
                        <td className="py-2 px-2 text-right font-bold">₹{it.price * it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-300 font-medium text-slate-600">
                      <td colSpan={4} className="py-1.5 px-2 text-right font-sans">
                        Items Subtotal:
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-medium">
                        ₹{selectedOrderForChallan.itemsTotal ?? selectedOrderForChallan.items.reduce((s, it) => s + it.price * it.quantity, 0)}
                      </td>
                    </tr>
                    <tr className="font-medium text-teal-800">
                      <td colSpan={4} className="py-1.5 px-2 text-right font-sans">
                        Courier & Delivery Charges:
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        {selectedOrderForChallan.courierCharges !== undefined && selectedOrderForChallan.courierCharges > 0
                          ? `+₹${selectedOrderForChallan.courierCharges}`
                          : 'FREE / Waived'}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-900 font-bold">
                      <td colSpan={4} className="py-2 px-2 text-right font-sans">
                        {selectedOrderForChallan.paymentMethod === 'Cash on Delivery'
                          ? 'Cash to Collect (COD Bill Total):'
                          : 'Amount Paid (Prepaid UPI Bill Total):'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-sm">
                        ₹{selectedOrderForChallan.totalAmount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Security & Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1 text-center">
                  <span className="font-semibold text-slate-700">Packed & Verified By (Staff)</span>
                  <div className="mt-4 font-mono">{currentUser.fullName}</div>
                </div>
                <div className="border-t border-slate-300 pt-1 text-center">
                  <span className="font-semibold text-slate-700">Patient Consignee Signature</span>
                  <div className="mt-4 text-slate-400">Date & Received Confirmation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Courier Settings Modal */}
      {isCourierSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm">Admin Courier Charges Control</h3>
              </div>
              <button
                onClick={() => setIsCourierSettingsModalOpen(false)}
                className="text-teal-200 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                updateCourierSettings(tempCourierSettings);
                setIsCourierSettingsModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-teal-950 block">Enable Courier Delivery Fees</span>
                  <span className="text-[11px] text-teal-700">If disabled, all online and clinic orders have ₹0 delivery.</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempCourierSettings.enabled}
                  onChange={e => setTempCourierSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Courier Charge (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={tempCourierSettings.standardCourierCharge}
                  onChange={e => setTempCourierSettings(prev => ({ ...prev, standardCourierCharge: Number(e.target.value) || 0 }))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Applied as baseline delivery fee for online orders and general courier.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hospete Depot Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={tempCourierSettings.hospeteDepotCharge}
                    onChange={e => setTempCourierSettings(prev => ({ ...prev, hospeteDepotCharge: Number(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hubballi Depot Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={tempCourierSettings.hubballiDepotCharge}
                    onChange={e => setTempCourierSettings(prev => ({ ...prev, hubballiDepotCharge: Number(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={tempCourierSettings.freeDeliveryAbove}
                  onChange={e => setTempCourierSettings(prev => ({ ...prev, freeDeliveryAbove: Number(e.target.value) || 0 }))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Set to 0 to require courier charges on all order amounts.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCourierSettingsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Courier Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
