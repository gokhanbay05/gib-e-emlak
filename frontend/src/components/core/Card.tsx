import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Card.css';

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'muted'
  | 'ai-summary'
  | 'interactive';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        variant !== 'default' && `card-${variant}`,
        `card-pad-${padding}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
