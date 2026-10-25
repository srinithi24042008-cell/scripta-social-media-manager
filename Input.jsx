import { forwardRef, useId } from 'react';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  fullWidth = true,
  className = '',
  wrapperClassName = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const baseClasses = `flex w-full rounded-xl border bg-surface px-4 py-2.5 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
    disabled:cursor-not-allowed disabled:opacity-50
    placeholder:text-slate-400`;
  
  const stateClasses = error 
    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500' 
    : 'border-border';

  const iconClasses = Icon ? 'pl-10' : '';
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <div className={`space-y-1.5 ${widthClasses} ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`${baseClasses} ${stateClasses} ${iconClasses} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-rose-500 animate-fade-in-down">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
