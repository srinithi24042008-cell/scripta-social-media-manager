import { forwardRef } from 'react';
import { motion } from 'framer-motion';

export const Card = forwardRef(({
  variant = 'default',
  hover = false,
  className = '',
  children,
  ...props
}, ref) => {
  const baseClasses = 'rounded-2xl border transition-all duration-300';
  
  const variants = {
    default: 'bg-surface border-border shadow-sm-soft',
    glass: 'bg-white/80 backdrop-blur-xl border-white/50 shadow-soft',
    flat: 'bg-muted/50 border-transparent',
    gradient: 'bg-gradient-to-br from-primary-50 to-white border-primary-100 shadow-soft',
  };

  const hoverClasses = hover ? 'hover:shadow-soft-lg hover:-translate-y-1' : '';

  return (
    <motion.div
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';
