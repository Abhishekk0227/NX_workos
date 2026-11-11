import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, X, ExternalLink, Sparkles } from 'lucide-react';

export default function PwaInstallButton({ className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] NX Work OS was installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show instructional modal if browser doesn't expose deferred prompt (e.g. Safari / iOS / Edge)
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Download / Install NX Work OS App"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs ${
          isInstalled
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
        } ${className}`}
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">App Installed</span>
            <span className="sm:hidden">App</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download App</span>
            <span className="sm:hidden">Download</span>
          </>
        )}
      </button>

      {/* PWA INSTALLATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Install NX Work OS</h3>
                  <p className="text-[11px] text-slate-300">Run as native Desktop or Mobile App</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-blue-950">
                <Laptop className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs font-bold text-blue-900">Chrome, Edge & Brave (Desktop):</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Click the <strong>Install Icon</strong> in your browser's address bar (top right) or press the 3 dots menu &rarr; <strong>"Install NX Work OS"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-emerald-950">
                <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs font-bold text-emerald-900">Android (Chrome):</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Tap the 3 dots menu icon in Chrome &rarr; Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl flex items-start gap-2.5 text-purple-950">
                <Smartphone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs font-bold text-purple-900">iPhone / iPad (iOS Safari):</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Tap the <strong>Share</strong> button at bottom &rarr; Scroll down and tap <strong>"Add to Home Screen"</strong> &rarr; Tap <strong>Add</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                ✓ Full offline attendance and punch caching <br />
                ✓ Standalone window without browser bars <br />
                ✓ Native OS push notification alerts
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
