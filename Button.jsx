import { forwardRef } from 'react';
import { Loader2,FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft hover:shadow-glow-violet',
  secondary: 'bg-surface border border-border text-slate-700 hover:bg-muted hover:text-slate-900',
  ghost: 'bg-transparent text-slate-600 hover:bg-muted hover:text-slate-900',
  danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700',
  glass: 'bg-white/50 backdrop-blur-md border border-white/40 text-slate-800 hover:bg-white/60',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-2',
};

export const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  icon: Icon,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && Icon && <Icon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
