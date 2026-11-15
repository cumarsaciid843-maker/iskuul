(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var DISMISS_KEY = 'sm_pwa_banner_dismissed_v1';
  var deferredPrompt = null;
  var listeners = new Set();

  function isStandaloneMode() {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );
    } catch (_) {
      return false;
    }
  }

  function isIOSDevice() {
    try {
      var ua = window.navigator.userAgent || '';
      var isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      return /iPhone|iPad|iPod/i.test(ua) || isTouchMac;
    } catch (_) {
      return false;
    }
  }

  function isDismissed() {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) {}
    notifySubscribers();
  }

  function getState() {
    return {
      canInstall: Boolean(deferredPrompt),
      isIOS: isIOSDevice(),
      isStandalone: isStandaloneMode(),
      isDismissed: isDismissed(),
    };
  }

  function notifySubscribers() {
    var state = getState();
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (_) {}
    });
    try {
      window.dispatchEvent(new CustomEvent('sm-pwa-state-change', { detail: state }));
    } catch (_) {}
  }

  async function promptInstall() {
    if (!deferredPrompt) return { supported: false, outcome: 'unavailable' };
    try {
      await deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      var outcome = choice && choice.outcome ? choice.outcome : 'dismissed';
      if (outcome === 'accepted') {
        deferredPrompt = null;
        dismiss();
      }
      notifySubscribers();
      return { supported: true, outcome: outcome };
    } catch (_) {
      return { supported: false, outcome: 'error' };
    }
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    dismiss();
  });

  try {
    var mq = window.matchMedia('(display-mode: standalone)');
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', notifySubscribers);
    }
  } catch (_) {}

  window.SchoolManagerPWA = {
    getState: getState,
    isStandalone: isStandaloneMode,
    isIOS: isIOSDevice,
    isDismissed: isDismissed,
    canInstall: function () {
      return Boolean(deferredPrompt);
    },
    dismiss: dismiss,
    promptInstall: promptInstall,
    subscribe: function (fn) {
      listeners.add(fn);
      return function () {
        listeners.delete(fn);
      };
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifySubscribers);
  } else {
    notifySubscribers();
  }
})();
