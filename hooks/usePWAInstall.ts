import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Estado global em módulo para preservar o evento beforeinstallprompt
// entre transições de rota (Landing -> Login -> Sistema logado).
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
let listenersInitialized = false;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((cb) => cb());
};

const detectPlatformFlags = () => {
  if (typeof window === 'undefined') {
    return {
      isStandalone: false,
      isIOS: false,
      isIOSSafari: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  const isIPadOS =
    window.navigator.platform === 'MacIntel' &&
    typeof window.navigator.maxTouchPoints === 'number' &&
    window.navigator.maxTouchPoints > 1;

  const isIOS = (/iphone|ipad|ipod/.test(ua) || isIPadOS) && !(window as Window & { MSStream?: unknown }).MSStream;
  const isIOSSafari =
    isIOS &&
    /safari/i.test(ua) &&
    !/crios|fxios|edgios|opios|fban|fbav|instagram|whatsapp|line/i.test(ua);

  const isAndroid = /android/i.test(ua);
  const isMobile =
    isIOS ||
    isAndroid ||
    /webos|blackberry|iemobile|opera mini/i.test(ua);

  return { isStandalone, isIOS, isIOSSafari, isAndroid, isMobile };
};

const ensureGlobalListeners = () => {
  if (listenersInitialized || typeof window === 'undefined') return;
  listenersInitialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsInstalled = true;
    notifySubscribers();
  });
};

ensureGlobalListeners();

export function usePWAInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    ensureGlobalListeners();
    const forceUpdate = () => setTick((t) => t + 1);
    subscribers.add(forceUpdate);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => forceUpdate();
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      subscribers.delete(forceUpdate);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const { isStandalone, isIOS, isIOSSafari, isAndroid, isMobile } = detectPlatformFlags();
  const isInstalled = globalIsInstalled || isStandalone;

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unsupported'> => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          globalIsInstalled = true;
          globalDeferredPrompt = null;
          notifySubscribers();
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.error('Error prompting PWA install:', err);
        return 'dismissed';
      }
    }

    if (isIOS && !isStandalone) {
      return 'ios';
    }

    return 'unsupported';
  }, [isIOS, isStandalone]);

  return {
    canInstall: (!!globalDeferredPrompt || isMobile) && !isInstalled && !isStandalone,
    isStandalone,
    isIOS,
    isIOSSafari,
    isAndroid,
    isMobile,
    isInstalled,
    installApp,
    hasNativePrompt: !!globalDeferredPrompt,
  };
}
