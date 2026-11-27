import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Tabs.css';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'pills' | 'segmented' | 'underline';
  className?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  variant = 'pills',
  className,
}: TabsProps) {
  return (
    <div className={cn('tabs-list', `tabs-${variant}`, className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn('tab-trigger', active && 'is-active')}
            onClick={() => onChange(item.value)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span style={{ opacity: 0.75, fontSize: '11.5px' }}>
                ({item.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
