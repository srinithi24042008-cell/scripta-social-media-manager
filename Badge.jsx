export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-primary-50 text-primary-700 border border-primary-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    // Platform variants
    instagram: 'bg-pink-50 text-pink-700 border border-pink-200',
    facebook: 'bg-blue-50 text-blue-700 border border-blue-200',
    linkedin: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    youtube: 'bg-red-50 text-red-700 border border-red-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClass} ${sizeClass} ${className}`}
    >
      {Icon && <Icon className={`w-3 h-3 ${children ? 'mr-1' : ''}`} />}
      {children}
    </span>
  );
};
