import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
      setLastOfflineAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isReconnecting,
    lastOfflineAt,
  };
}
