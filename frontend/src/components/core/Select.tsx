import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import '../../css/core/Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'size' | 'onChange'
  > {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  pill?: boolean;
  inline?: boolean;
  selectSize?: 'sm' | 'md';
  error?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder,
  pill = false,
  inline,
  selectSize = 'md',
  error,
  className,
  ...props
}: SelectProps) {
  const isInline = inline ?? (!label && selectSize === 'sm');

  return (
    <div className={cn('select-container', isInline && 'select-inline')}>
      {label && <label className="select-label">{label}</label>}
      <div className="select-wrapper">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'select-field',
            pill && 'select-pill',
            selectSize === 'sm' && 'select-sm',
            className,
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="select-chevron">
          <ChevronDown size={15} />
        </span>
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

export default Select;
