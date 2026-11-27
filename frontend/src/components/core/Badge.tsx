import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Badge.css';

export type BadgeVariant =
  | 'primary'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'verified'
  | 'ai';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)} {...props}>
      {icon}
      {children}
    </span>
  );
}

export default Badge;
