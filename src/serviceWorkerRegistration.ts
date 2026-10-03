import { registerSW } from 'virtual:pwa-register';

export function initPWA() {
  if ('serviceWorker' in navigator) {
    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content is available; refreshing...');
          updateSW(true);
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
