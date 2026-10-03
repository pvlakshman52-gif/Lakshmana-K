import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X, Share2, PlusSquare, CheckCircle2, Laptop } from 'lucide-react';
import { LocalSystemInstallModal } from './LocalSystemInstallModal';
import { downloadWindowsDesktopInstaller } from '../../utils/pwaInstallHelper';

interface PWAInstallButtonProps {
  compact?: boolean;
  onOpenPwaSync?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false, onOpenPwaSync }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showSystemInstallModal, setShowSystemInstallModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed standalone PWA, still allow opening PWA / Offline Sync Suite
  if (isInstalled) {
    if (!onOpenPwaSync) return null;
    return (
      <button
        onClick={onOpenPwaSync}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
        title="PWA Installed - Open Offline Sync Suite"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden md:inline">PWA Active</span>
      </button>
    );
  }

  const handleInstallClick = async () => {
    // 1. If native browser PWA install prompt is ready, trigger it immediately
    if (isInstallable) {
      try {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 4000);
          return;
        }
      } catch (err) {
        console.warn('Native install prompt deferred or unhandled:', err);
      }
    }

    // 2. If on iOS Safari, show the iOS installation guide modal
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // 3. Automatically start installing to local system:
    // Download the Windows Desktop Standalone Installer (.bat) and open the Local System Install Assistant
    downloadWindowsDesktopInstaller();
    setShowSystemInstallModal(true);
  };

  return (
    <>
      {/* Install Button matching screenshot style */}
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 font-bold transition-all shadow-xs cursor-pointer ${
          isInstallable
            ? compact
              ? 'px-2.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs rounded-lg'
              : 'px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs rounded-xl hover:shadow-md'
            : compact
              ? 'px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs rounded-lg'
              : 'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs rounded-xl shadow-2xs'
        }`}
        title="Install MediClinic ERP on your local system (Desktop, Taskbar, Android)"
      >
        <Download className="w-3.5 h-3.5 text-teal-700" />
        <span>Install PWA</span>
      </button>

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-16 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>App installed successfully! Check your home screen or desktop.</span>
        </div>
      )}

      {/* Local System Installation Modal (Windows Desktop Installer + Browser PWA) */}
      <LocalSystemInstallModal
        isOpen={showSystemInstallModal}
        onClose={() => setShowSystemInstallModal(false)}
        onNativeInstallPrompt={install}
        isInstallable={isInstallable}
      />

      {/* iOS Safari Installation Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm">
                  MC
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Install MediClinic ERP</h3>
                  <p className="text-[11px] text-slate-500">For Apple iPhone &amp; iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Step 1:</span> Tap the <strong>Share</strong> button at the bottom of Safari toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Step 2:</span> Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Step 3:</span> Tap <strong>Add</strong> at top right. Launch directly from your home screen as a standalone app!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
