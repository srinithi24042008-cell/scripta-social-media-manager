import { useRef, useState } from 'react';

export default function ConfirmButton({ onConfirm, className = '', confirmClassName = '', confirmLabel = 'Sure?', children, ...props }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  function handleClick(e) {
    e.stopPropagation();
    if (confirming) {
      clearTimeout(timerRef.current);
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 2500);
    }
  }

  const defaultClasses = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm cursor-pointer select-none';
  const baseClass = className || defaultClasses;
  const activeConfirmClass = confirmClassName || 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-600 bg-rose-600 text-xs font-bold text-white shadow-sm transition-all cursor-pointer select-none';

  return (
    <button type="button" onClick={handleClick} className={confirming ? activeConfirmClass : baseClass} {...props}>
      {confirming ? confirmLabel : children}
    </button>
  );
}
