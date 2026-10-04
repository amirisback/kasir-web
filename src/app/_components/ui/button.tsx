import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const sizeStyles = {
      sm: 'min-h-[38px] px-3 py-1.5 text-xs gap-1.5',
      md: 'min-h-[44px] px-4 py-2 text-sm gap-2',
      lg: 'min-h-[50px] px-6 py-3 text-base gap-2.5',
    }[size];

    const variantStyles = {
      primary:
        'bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-sm',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90',
      outline:
        'border border-border bg-card text-foreground hover:bg-muted active:bg-muted/80',
      danger:
        'bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90 shadow-sm',
      ghost:
        'text-foreground hover:bg-muted/70 active:bg-muted',
    }[variant];

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyle} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
