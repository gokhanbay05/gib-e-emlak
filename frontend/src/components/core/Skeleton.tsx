import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Skeleton.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn('gib-skeleton', className)}
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
}

export function PropertySkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="gib-skeleton-card-grid">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            borderRadius: '16px',
            border: '1px solid var(--color-border-default)',
            backgroundColor: 'var(--color-bg-surface)',
            overflow: 'hidden',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <Skeleton height="170px" borderRadius="12px" />
          <Skeleton width="45%" height="20px" />
          <Skeleton width="90%" height="15px" />
          <Skeleton width="65%" height="13px" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
