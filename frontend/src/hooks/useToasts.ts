import { useCallback, useRef, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  title: string;
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const pushToast = useCallback(
    (title: string, message: string, type: ToastType = 'success') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, title, message, type, visible: false }]);

      // Next tick so the mount transition (opacity/transform) actually
      // animates in, matching the old code's 10ms delay before adding
      // the .show class.
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: true } : t))
        );
      }, 10);

      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 400);
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}
