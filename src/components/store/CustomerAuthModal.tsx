import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Customer } from '../../types/erp';
import { 
  X, 
  Phone, 
  Lock, 
  User as UserIcon, 
  MapPin, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface CustomerAuthModalProps {
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  targetProductTitle?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ 
  onClose, 
  onSuccess,
  targetProductTitle 
}) => {
  const { 
    sendCustomerOTP, 
    loginCustomerWithOTP, 
    registerCustomer, 
    loginCustomerWithPassword,
    customers 
  } = useClinic();

  // Tabs: 'otp' | 'register' | 'password'
  const [activeTab, setActiveTab] = useState<'otp' | 'register' | 'password'>('otp');

  // OTP Form States
  const [mobileNo, setMobileNo] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [generatedOtpDisplay, setGeneratedOtpDisplay] = useState('');
  const [isNewUserStep, setIsNewUserStep] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserAddress, setNewUserAddress] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regMobile, setRegMobile] = useState('');

  // Password Login States
  const [passIdentifier, setPassIdentifier] = useState('');
  const [passPassword, setPassPassword] = useState('');

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Send OTP
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = sendCustomerOTP(mobileNo);
    if (res.success) {
      setIsOtpSent(true);
      setGeneratedOtpDisplay(res.otp);
      setSuccessMessage(res.message);
    } else {
      setErrorMessage(res.message);
    }
  };

  // Handle Verify OTP
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If new user completing profile
    if (isNewUserStep) {
      if (!newUserName.trim() || !newUserAddress.trim()) {
        setErrorMessage('Please enter your full name and delivery address.');
        return;
      }
      const res = registerCustomer({
        customerName: newUserName,
        phone: mobileNo,
        address: newUserAddress
      });
      if (res.success && res.customer) {
        onSuccess(res.customer);
      }
      return;
    }

    const res = loginCustomerWithOTP(mobileNo, otpCode);
    if (res.success && res.customer) {
      if (res.isNewCustomer && (!res.customer.address || !res.customer.customerName || res.customer.customerName.startsWith('Customer ('))) {
        setIsNewUserStep(true);
        setSuccessMessage('Mobile verified! Please provide your name and delivery address to complete order.');
      } else {
        onSuccess(res.customer);
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  // Handle Register
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!regName.trim() || !regAddress.trim() || !regMobile.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }

    const res = registerCustomer({
      customerName: regName,
      password: regPassword,
      address: regAddress,
      phone: regMobile
    });

    if (res.success && res.customer) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        onSuccess(res.customer!);
      }, 500);
    } else {
      setErrorMessage(res.message);
    }
  };

  // Handle Password Login
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = loginCustomerWithPassword(passIdentifier, passPassword);
    if (res.success && res.customer) {
      onSuccess(res.customer);
    } else {
      setErrorMessage(res.message);
    }
  };

  const fillSampleCustomer = (c: Customer) => {
    setMobileNo(c.phone);
    setPassIdentifier(c.phone);
    setPassPassword('password123');
    setRegName(c.customerName);
    setRegMobile(c.phone);
    setRegAddress(c.address);
    setRegPassword('password123');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-base">Customer Sign In / Register</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {targetProductTitle ? `To purchase "${targetProductTitle}", please verify your identity.` : 'Sign in to buy authentic dermatological products.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => { setActiveTab('otp'); setErrorMessage(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'otp' 
                ? 'border-teal-600 text-teal-900 bg-white' 
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            📱 Mobile OTP Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMessage(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'register' 
                ? 'border-teal-600 text-teal-900 bg-white' 
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            ✨ New Registration
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setErrorMessage(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'password' 
                ? 'border-teal-600 text-teal-900 bg-white' 
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            🔑 Password Login
          </button>
        </div>

        <div className="p-6 text-xs space-y-4">
          
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: MOBILE OTP AUTHENTICATION */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              {!isOtpSent ? (
                /* Step 1: Mobile Number Input */
                <form onSubmit={handleSendOTP} className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-semibold">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobileNo}
                        onChange={e => setMobileNo(e.target.value.replace(/\D/g, ''))}
                        placeholder="9845123980"
                        className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      We will generate and send a 4-digit SMS OTP verification code.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : !isNewUserStep ? (
                /* Step 2: Enter OTP Code */
                <form onSubmit={handleVerifyOTP} className="space-y-3.5">
                  <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900">
                      <span>SMS OTP Sent to +91 {mobileNo}</span>
                      <button
                        type="button"
                        onClick={() => setIsOtpSent(false)}
                        className="text-teal-700 underline text-[10px]"
                      >
                        Change Number
                      </button>
                    </div>
                    <div className="text-xs font-mono font-bold text-teal-800 mt-1 bg-white p-2 rounded border border-teal-200 flex items-center justify-between">
                      <span>Verification Code:</span>
                      <span className="text-sm tracking-widest text-teal-900">{generatedOtpDisplay || '1234'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Enter 4-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="e.g. 4829 or 1234"
                      className="w-full p-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Verify Code & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Step 3: Complete Profile for New User */
                <form onSubmit={handleVerifyOTP} className="space-y-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
                    ✓ Phone verified! Please provide your name and delivery address to complete your checkout.
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">User Name (Full Name)</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      placeholder="e.g. Basavaraj Patil"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Delivery Address</label>
                    <textarea
                      required
                      rows={2}
                      value={newUserAddress}
                      onChange={e => setNewUserAddress(e.target.value)}
                      placeholder="House / Flat No, Street, Colony, Hospete / Hubballi"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-all shadow-md"
                  >
                    Save & Continue to Order
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER NEW CUSTOMER WITH 4 FIELDS */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="text-[11px] text-slate-500 mb-2">
                Register once to buy clinic-certified products, track deliveries, and manage orders.
              </div>

              {/* Field 1: User Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">User Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Hiremath"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Create your account password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Field 3: Address */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Delivery Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regAddress}
                    onChange={e => setRegAddress(e.target.value)}
                    placeholder="e.g. #42 Vidyanagar, Hubballi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Field 4: Mobile No */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile No.</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMobile}
                    onChange={e => setRegMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9741005521"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Register & Proceed to Buy</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD LOGIN */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile No. or User Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={passIdentifier}
                    onChange={e => setPassIdentifier(e.target.value)}
                    placeholder="e.g. 9845123980 or Sunita Patil"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={passPassword}
                    onChange={e => setPassPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Sign In & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Preset Demo Patient Accounts */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or click registered customer for quick demo fill:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {customers.slice(0, 2).map(c => (
                <button
                  key={c.customerId}
                  type="button"
                  onClick={() => fillSampleCustomer(c)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 text-left transition-colors truncate"
                >
                  <span className="font-semibold block truncate">{c.customerName}</span>
                  <span className="text-slate-400 font-mono text-[9px]">{c.phone}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
