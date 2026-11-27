import React from 'react';
import '../../css/core/Breadcrumb.css';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  rightAction?: React.ReactNode;
}

export function Breadcrumb({ items, rightAction }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb-bar" aria-label="Sayfa konumu">
      <div className="breadcrumb-list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <span key={`${item.label}-${idx}`} className="breadcrumb-item">
              {item.onClick && !isLast ? (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? 'breadcrumb-current' : ''}>
                  {item.label}
                </span>
              )}
              {!isLast && <span className="breadcrumb-sep">/</span>}
            </span>
          );
        })}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </nav>
  );
}

export default Breadcrumb;
