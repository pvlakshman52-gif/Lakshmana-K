import { registerSW } from 'virtual:pwa-register';

export function initPWA() {
  // Never register service worker inside an iframe (e.g. AI Studio preview environment)
  // to avoid cross-origin / third-party storage partitioning SecurityErrors
  if (typeof window === 'undefined') return;
  
  const isIframe = window.self !== window.top;
  if (isIframe) {
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;
      updateSWFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content is available; refreshing...');
          if (updateSWFn) {
            updateSWFn(true);
          }
        },
        onOfflineReady() {
          console.log('[PWA] Application is fully precached and ready to work offline.');
        },
        onRegisterError(error) {
          console.warn('[PWA] Service Worker registration failed:', error);
        }
      });
    } catch (err) {
      console.warn('[PWA] Could not initialize virtual service worker:', err);
    }
  }
}

