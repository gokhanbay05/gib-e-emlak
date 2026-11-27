import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outline-primary'
  | 'ghost'
  | 'danger'
  | 'whatsapp'
  | 'ai';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      pill = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'btn',
          `btn-${variant}`,
          size === 'icon' || size === 'icon-sm' ? `btn-${size}` : `btn-${size}`,
          pill && 'btn-pill',
          fullWidth && 'btn-full',
          className,
        )}
        {...props}
      >
        {leftIcon && <span className="btn-icon-slot">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="btn-icon-slot">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
