import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { UserRole } from '../../types/erp';
import { 
  Lock, 
  User as UserIcon, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface LoginScreenProps {
  onSuccess?: () => void;
  onOpenStore?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onOpenStore }) => {
  const { locations, users, loginUser, resetUserPassword } = useClinic();

  // Mode: 'user' (User Name, Password, Location, Reset Password) vs 'admin' (User Name, Password, Phone No., Location, Role)
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Form Fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [phone, setPhone] = useState('9845012345');
  const [locationId, setLocationId] = useState('LOC-HOS');
  const [role, setRole] = useState<UserRole>('Admin');
  const [showPassword, setShowPassword] = useState(false);

  // Status message
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset Password Modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetStatus, setResetStatus] = useState<{ success?: boolean; message: string } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isAdminMode) {
      // Validate that only Admin can use this 5-field Admin screen
      const trimmed = username.trim().toLowerCase();
      const userObj = users.find(u => u.username.toLowerCase() === trimmed);
      if (userObj && userObj.role !== 'Admin') {
        setErrorMessage(`Access restricted: "${userObj.fullName}" is assigned role "${userObj.role}". This 5-field authentication screen is restricted to Administrator role only. Please use the User/Staff Login tab.`);
        return;
      }
    }

    const res = loginUser({
      username,
      password,
      locationId,
      phone: isAdminMode ? phone : undefined,
      role: isAdminMode ? role : undefined
    });

    if (res.success) {
      setSuccessMessage(res.message);
      if (onSuccess) {
        setTimeout(onSuccess, 400);
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const res = resetUserPassword(resetUsername, resetPhone, resetNewPass);
    setResetStatus(res);
    if (res.success) {
      setTimeout(() => {
        setIsResetOpen(false);
        setPassword(resetNewPass);
        setUsername(resetUsername);
        setResetStatus(null);
      }, 1500);
    }
  };

  const applyPreset = (uName: string, pass: string, loc: string, ph: string, r: UserRole, admin: boolean) => {
    setUsername(uName);
    setPassword(pass);
    setLocationId(loc);
    setPhone(ph);
    setRole(r);
    setIsAdminMode(admin);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center items-center p-4">
      
      {/* Brand Header */}
      <div className="text-center mb-6 max-w-md">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-lg mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">MediClinic Commerce ERP</h1>
        <p className="text-xs text-slate-300 mt-1">
          Hospete & Hubballi Dermatology Multi-Location Pharmacy & Practice
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md p-6 sm:p-8 backdrop-blur-sm">
        
        {/* Toggle between Staff / User View and Admin View */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(false);
              setUsername('staff.hospete');
              setPassword('hospete123');
              setLocationId('LOC-HOS');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
              !isAdminMode 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>User / Staff Login</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">User Name, Password, Location</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(true);
              setUsername('admin');
              setPassword('admin123');
              setRole('Admin');
              setPhone('9845012345');
              setLocationId('LOC-HOS');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
              isAdminMode 
                ? 'bg-teal-700 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>👑 Admin Login</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isAdminMode ? 'bg-white/20' : 'bg-slate-200'}`}>5 Fields</span>
            </div>
            <span className={`text-[10px] font-normal ${isAdminMode ? 'text-teal-100' : 'text-slate-400'}`}>
              Phone No. & Role Required
            </span>
          </button>
        </div>

        {/* View Mode Notice */}
        <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <h2 className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>{isAdminMode ? '👑 Administrator Login Screen' : '👤 Clinical User / Staff Screen'}</span>
            <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              {isAdminMode ? '5 Fields Required' : '3 Fields + Password Reset'}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            {isAdminMode 
              ? 'Admin screen verifies: User Name, Password, Phone No., Location, and Role authorization.'
              : 'User screen displays only: User Name, Password, Location, and Reset Password.'}
          </p>
        </div>

        {/* Feedback Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          
          {/* Field 1: User Name (Both User & Admin) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">User Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin or staff.hospete"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Field 2: Password (Both User & Admin) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">Password</label>
              {!isAdminMode && (
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-teal-700 hover:text-teal-900 font-medium text-[11px] underline"
                >
                  Reset password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 3: Phone No. (ADMIN ONLY) */}
          {isAdminMode && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Phone No. <span className="text-teal-700 text-[10px] font-mono">(Admin security phone)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          )}

          {/* Field 4: Location (Both User & Admin) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Location {isAdminMode ? <span className="text-teal-700 text-[10px] font-mono">(Physical Login Terminal)</span> : <span className="text-slate-500 text-[10px]">(Assigned Clinic Branch)</span>}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden cursor-pointer"
              >
                <option value="LOC-HOS">Hospete Clinic & Pharmacy [HOS]</option>
                <option value="LOC-HUB">Hubballi Clinic & Pharmacy [HUB]</option>
                {isAdminMode && (
                  <option value="ALL">All Branches (Consolidated Master)</option>
                )}
              </select>
            </div>
            {isAdminMode ? (
              <p className="text-[11px] text-teal-700 mt-1">
                ✓ Administrator login allows viewing consolidated data across all clinic locations in the dashboard.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Clinical staff dashboard access is strictly scoped to your assigned branch.
              </p>
            )}
          </div>

          {/* Reset Password Action Row for User (Only on User mode) */}
          {!isAdminMode && (
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-medium">Forgot or want to change password?</span>
              <button
                type="button"
                onClick={() => {
                  setResetUsername(username);
                  setIsResetOpen(true);
                }}
                className="text-teal-800 hover:text-teal-950 font-bold text-xs flex items-center gap-1 px-2.5 py-1 bg-white border border-teal-300 rounded-md shadow-2xs hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-teal-700" />
                <span>Reset Password</span>
              </button>
            </div>
          )}

          {/* Field 5: Role (ADMIN ONLY) */}
          {isAdminMode && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Role <span className="text-teal-700 text-[10px] font-mono">(Assigned Authorization)</span>
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden cursor-pointer font-medium"
                >
                  <option value="Admin">Administrator (Dr. Lakshman Rao)</option>
                  <option value="Doctor">Doctor / Dermatologist</option>
                  <option value="Staff">Clinical Counter Staff</option>
                  <option value="Cashier">Billing Cashier</option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
          >
            <span>{isAdminMode ? 'Authenticate Admin & Open System' : 'Sign In as Staff'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Credentials Pills */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick Fill Preset Credentials:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => applyPreset('admin', 'admin123', 'LOC-HOS', '9845012345', 'Admin', true)}
              className="p-1.5 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-900 font-medium text-left truncate"
            >
              👑 Admin (Dr. Rao)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('staff.hospete', 'hospete123', 'LOC-HOS', '9845198765', 'Staff', false)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left truncate"
            >
              🏥 Staff Hospete
            </button>
            <button
              type="button"
              onClick={() => applyPreset('staff.hubballi', 'hubballi123', 'LOC-HUB', '9741087654', 'Staff', false)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left truncate"
            >
              🏥 Staff Hubballi
            </button>
          </div>
        </div>

        {/* Public Storefront Direct Link */}
        {onOpenStore && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onOpenStore}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Customer / Patient? Visit Online Storefront →</span>
            </button>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-xs">
            <div className="flex items-center gap-2 mb-2 text-teal-800">
              <KeyRound className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-sm text-slate-900">Reset User Password</h3>
            </div>
            <p className="text-slate-500 text-[11px] mb-4">
              Enter your username and registered phone number to verify identity and set a new password.
            </p>

            {resetStatus && (
              <div className={`p-2.5 rounded-lg mb-3 flex items-center gap-2 ${
                resetStatus.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {resetStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{resetStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">User Name</label>
                <input
                  type="text"
                  required
                  value={resetUsername}
                  onChange={e => setResetUsername(e.target.value)}
                  placeholder="e.g. staff.hospete"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Registered Phone No.</label>
                <input
                  type="tel"
                  required
                  value={resetPhone}
                  onChange={e => setResetPhone(e.target.value)}
                  placeholder="e.g. 9845198765"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={e => setResetNewPass(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
