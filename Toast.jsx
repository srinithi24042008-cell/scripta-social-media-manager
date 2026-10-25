import { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, FileText, } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: CheckCircle,
  },
  error: {
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    icon: AlertCircle,
  },
  info: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    icon: Info,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, message, type, action }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, action ? 5000 : 3200);
    return id;
  }, []);

  function dismiss(id) {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-5 right-5 z-50 space-y-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => {
            const style = STYLES[t.type] || STYLES.info;
            const Icon = style.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`${style.bg} ${style.border} ${style.text} border rounded-2xl px-4 py-3 shadow-soft-lg flex items-start gap-3`}
              >
                <Icon size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium flex-1">{t.message}</p>
                {t.action && (
                  <button
                    onClick={() => { t.action.onClick(); dismiss(t.id); }}
                    className="text-xs font-bold underline decoration-dotted hover:decoration-solid shrink-0"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}