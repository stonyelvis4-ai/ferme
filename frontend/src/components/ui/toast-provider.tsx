'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastIcon(variant: ToastVariant) {
  if (variant === 'success') {
    return CheckCircle2;
  }

  if (variant === 'error') {
    return CircleAlert;
  }

  return Info;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const removeToast = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = 'info' }: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = toastIcon(item.variant);

            return (
              <motion.article
                key={item.id}
                className={`toast-card toast-${item.variant}`}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
              >
                <div className="toast-icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="toast-copy">
                  <strong>{item.title}</strong>
                  {item.description ? <span>{item.description}</span> : null}
                </div>
                <button
                  className="toast-close"
                  type="button"
                  aria-label="Fermer la notification"
                  onClick={() => removeToast(item.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
