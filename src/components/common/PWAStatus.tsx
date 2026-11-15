import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';

interface PWAState {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isDismissed: boolean;
}

interface SchoolManagerPWABridge {
  getState: () => PWAState;
  isStandalone: () => boolean;
  isIOS: () => boolean;
  isDismissed: () => boolean;
  canInstall: () => boolean;
  dismiss: () => void;
  promptInstall: () => Promise<{ supported: boolean; outcome: string }>;
  subscribe: (fn: (state: PWAState) => void) => () => void;
}

declare global {
  interface Window {
    SchoolManagerPWA?: SchoolManagerPWABridge;
  }
}

const DISMISS_STORAGE_KEY = 'sm_pwa_banner_dismissed_v1';

function readLocalDismissed(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLocalDismissed(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, '1');
    }
  } catch {
    // Ignore storage errors (e.g. private browsing)
  }
}

function readStandalone(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function readIsIOS(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/i.test(ua) || isTouchMac;
  } catch {
    return false;
  }
}

function usePWAState(): PWAState & {
  dismissBanner: () => void;
  promptInstall: () => Promise<{ supported: boolean; outcome: string }>;
} {
  const [state, setState] = useState<PWAState>(() => {
    if (typeof window !== 'undefined' && window.SchoolManagerPWA) {
      return window.SchoolManagerPWA.getState();
    }
    return {
      canInstall: false,
      isIOS: readIsIOS(),
      isStandalone: readStandalone(),
      isDismissed: readLocalDismissed(),
    };
  });

  useEffect(() => {
    const sync = () => {
      if (window.SchoolManagerPWA) {
        setState(window.SchoolManagerPWA.getState());
      } else {
        setState({
          canInstall: false,
          isIOS: readIsIOS(),
          isStandalone: readStandalone(),
          isDismissed: readLocalDismissed(),
        });
      }
    };
    sync();

    const onEvent = () => sync();
    window.addEventListener('sm-pwa-state-change', onEvent);
    window.addEventListener('appinstalled', onEvent);

    const onBeforeInstall = () => setTimeout(sync, 0);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('sm-pwa-state-change', onEvent);
      window.removeEventListener('appinstalled', onEvent);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const dismissBanner = () => {
    if (window.SchoolManagerPWA) {
      window.SchoolManagerPWA.dismiss();
    } else {
      writeLocalDismissed();
    }
    setState((prev) => ({ ...prev, isDismissed: true }));
  };

  const promptInstall = async () => {
    if (window.SchoolManagerPWA) {
      return window.SchoolManagerPWA.promptInstall();
    }
    return { supported: false, outcome: 'unavailable' };
  };

  return { ...state, dismissBanner, promptInstall };
}

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg max-w-[calc(100vw-2rem)]"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>Offline Mode — Cached data active</span>
    </div>
  );
};

interface InstallInstructionsModalProps {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}

const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({
  isOpen,
  isIOS,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isIOS ? 'Add School Manager to Home Screen' : 'Install School Manager'}
        className="bg-white border border-[#E4E6F3] rounded-3xl w-full max-w-[min(420px,calc(100vw-2rem))] max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl text-[#23265A] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#5359A7] text-white flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-sora font-extrabold text-base text-[#23265A]">
                {isIOS ? 'Install on iPhone / iPad' : 'Install School Manager'}
              </h3>
              <p className="text-xs text-[#555A8A] mt-0.5">
                {isIOS
                  ? 'Add to your Home Screen in Safari:'
                  : 'Install as a standalone web app:'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instructions"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <ol className="space-y-3 bg-[#F8F8FD] border border-[#E4E6F3] rounded-2xl p-4 text-xs sm:text-sm text-[#23265A]">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#5359A7] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                1
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                Tap the <strong>Share</strong> button{' '}
                <Share size={15} className="text-[#5359A7] inline shrink-0" /> in Safari&apos;s toolbar.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#5359A7] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 bg-[#F8F8FD] border border-[#E4E6F3] rounded-2xl p-4 text-xs sm:text-sm text-[#23265A]">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#5359A7] text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                Open your browser&apos;s address bar or menu (<strong>⋮</strong>) and choose{' '}
                <strong>Install School Manager</strong> or <strong>Add to Home screen</strong>.
              </span>
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-full bg-[#5359A7] text-white font-sora font-bold text-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export const TopPWAInstallBanner: React.FC = () => {
  const { canInstall, isIOS, isStandalone, isDismissed, dismissBanner, promptInstall } = usePWAState();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      const result = await promptInstall();
      if (result.supported) return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <div
        id="sm-pwa-top-banner"
        role="region"
        aria-label="Download School Manager App"
        className="w-full bg-[#5359A7] text-white border-b border-white/15 pt-[env(safe-area-inset-top)]"
      >
        <div className="max-w-7xl mx-auto ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Rounded Square Icon + Heading + Subtitle */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div
              aria-hidden="true"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0"
            >
              <Download size={20} className="text-white" strokeWidth={2.2} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-sora font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white leading-snug">
                DOWNLOAD SCHOOL MANAGER APP
              </div>
              <p className="text-[11px] sm:text-xs text-white/85 leading-snug mt-0.5">
                Install School Manager as a web app for instant access directly from your home screen.
              </p>
            </div>

            {/* Far-right close button on mobile (<640px) */}
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss install banner"
              className="sm:hidden min-w-[44px] min-h-[44px] -mt-0.5 -me-1 rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Right: INSTALL APP + Far-right X button on tablet/desktop */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full bg-white text-[#5359A7] hover:bg-white/95 font-sora font-extrabold text-xs tracking-wide uppercase shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              INSTALL APP
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss install banner"
              className="hidden sm:flex min-w-[44px] min-h-[44px] rounded-full items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <InstallInstructionsModal
        isOpen={showInstructions}
        isIOS={isIOS}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
};

export const PWAInstallFooterLink: React.FC = () => {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePWAState();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    if (canInstall) {
      const result = await promptInstall();
      if (result.supported) return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="min-h-[44px] md:min-h-0 px-1 inline-flex items-center gap-1.5 text-[#5359A7] hover:underline cursor-pointer"
      >
        <Download size={13} className="shrink-0" />
        <span>Install app</span>
      </button>
      <InstallInstructionsModal
        isOpen={showInstructions}
        isIOS={isIOS}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
};
