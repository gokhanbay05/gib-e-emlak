import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Avatar.css';

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className={cn('avatar-wrap', className)}>
      <div
        className={cn(
          'avatar',
          `avatar-${size}`,
          shape === 'rounded' && 'avatar-rounded',
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            className="avatar-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    </div>
  );
}

export default Avatar;
