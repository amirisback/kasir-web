import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'espresso' | 'success' | 'outline' | 'secondary' | 'primary';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }[size];

  const variantStyles = {
    primary: 'bg-primary text-primary-foreground border border-primary/25',
    amber: 'bg-primary/15 text-primary border border-primary/25',
    espresso: 'bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    secondary: 'bg-secondary text-secondary-foreground border border-border/50',
    outline: 'border border-border text-muted-foreground bg-transparent',
  }[variant];

  return (
    <span
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
