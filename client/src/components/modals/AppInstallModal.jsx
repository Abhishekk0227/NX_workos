import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  MoreVertical,
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  Bell,
  WifiOff,
  ShieldCheck
} from 'lucide-react';

export default function AppInstallModal({ isOpen, onClose, deferredPrompt, onPromptInstall }) {
  const [platform, setPlatform] = useState('android'); // 'android' | 'ios' | 'desktop'
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already installed / standalone
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // Auto-detect user platform
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/30">
                NX
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight text-white">
                    Download NX Work OS App
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-300 rounded-full border border-blue-400/30">
                    PWA Native
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Install directly on Android, iPhone, Windows, or Mac
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Install Action if browser supports beforeinstallprompt */}
          {deferredPrompt && !isStandalone && (
            <div className="mt-5 p-3.5 bg-blue-600/30 border border-blue-400/40 rounded-2xl flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
                <span className="text-xs font-semibold text-white">
                  Fast 1-Click Install Available on this Browser!
                </span>
              </div>
              <button
                onClick={() => {
                  if (onPromptInstall) onPromptInstall();
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </button>
            </div>
          )}

          {isStandalone && (
            <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-semibold relative z-10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>NX Work OS App is already installed and running on this device!</span>
            </div>
          )}
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50/80 px-6 pt-3 gap-2">
          <button
            onClick={() => setPlatform('android')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              platform === 'android'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Chrome)</span>
          </button>

          <button
            onClick={() => setPlatform('ios')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              platform === 'ios'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            onClick={() => setPlatform('desktop')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              platform === 'desktop'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>PC / Mac Desktop</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ANDROID INSTRUCTIONS */}
          {platform === 'android' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Chrome Browser ke Menu (⋮) par tap karein
                    <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Apne Android phone me Google Chrome open karein aur upar right corner me 3 dots par tap karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    "Install app" ya "Add to Home screen" chunein
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Menu options me se <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par click karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    "Install" par tap karein
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Confirmation prompt aayega. <strong>Install</strong> par tap karte hi app aapke phone ke app drawer aur home screen par install ho jayegi!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* IOS INSTRUCTIONS */}
          {platform === 'ios' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Safari Browser me "Share" button tap karein
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Apne iPhone / iPad me <strong>Safari</strong> browser use karein aur screen ke bottom toolbar me <strong>Share icon (square with arrow ↑)</strong> par tap karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    "Add to Home Screen" select karein
                    <PlusSquare className="w-3.5 h-3.5 text-blue-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Share sheet ko neeche scroll karein aur <strong>"Add to Home Screen" (+)</strong> par click karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Top Right me "Add" par tap karein
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upar right corner me <strong>"Add"</strong> par tap karein. NX Work OS icon aapke iPhone home screen par native app ki tarah appear ho jayega!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DESKTOP INSTRUCTIONS */}
          {platform === 'desktop' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Address Bar me Install Icon dekhein
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Google Chrome ya Microsoft Edge browser ke URL bar ke right corner me <strong>"Install app"</strong> icon (computer screen with down arrow) par click karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Ya Browser Menu (⋮) se Install karein
                    <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Browser ke 3 dots menu (⋮) par click karke <strong>"Install NX Work OS..."</strong> ya <strong>"Save and share → Install"</strong> par click karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Desktop App Ready
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    NX Work OS standalone desktop window me launch ho jayega aur Taskbar / Start Menu par pin ho jayega!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="pt-2 border-t border-slate-100">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              App Features & Advantages
            </h5>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100/60">
                <Zap className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="block text-[11px] font-bold text-slate-800">1-Tap Launch</span>
                <span className="text-[10px] text-slate-500">No URL typing</span>
              </div>
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100/60">
                <Bell className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <span className="block text-[11px] font-bold text-slate-800">Push Alerts</span>
                <span className="text-[10px] text-slate-500">Live shift alerts</span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100/60">
                <WifiOff className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span className="block text-[11px] font-bold text-slate-800">Offline Cache</span>
                <span className="text-[10px] text-slate-500">Loads fast</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
