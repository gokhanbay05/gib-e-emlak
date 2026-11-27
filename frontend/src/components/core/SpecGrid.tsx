import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/SpecGrid.css';

export interface SpecGridItem {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

export interface SpecGridProps {
  items: SpecGridItem[];
  className?: string;
}

/**
 * Hepsiemlak Screenshot #7 tarzı 2 sütunlu, yuvarlatılmış gri bilgi satırları tablosu.
 */
export function SpecGrid({ items, className }: SpecGridProps) {
  return (
    <div className={cn('spec-grid', className)}>
      {items.map((item) => (
        <div key={item.label} className="spec-pill-row">
          <span className="spec-pill-label">{item.label}</span>
          <span
            className={cn(
              'spec-pill-value',
              item.highlight && 'is-highlight',
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SpecGrid;
