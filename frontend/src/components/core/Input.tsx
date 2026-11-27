import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/core/Input.css';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  pill?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  multiline?: boolean;
  rows?: number;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      icon,
      rightElement,
      pill = false,
      inputSize = 'md',
      multiline = false,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="input-container">
        {label && <label className="input-label">{label}</label>}

        <div className="input-wrapper">
          {icon && <div className="input-icon-left">{icon}</div>}

          {multiline ? (
            <textarea
              rows={rows}
              className={cn(
                'input-field',
                'input-textarea',
                error && 'has-error',
                className,
              )}
              value={props.value}
              onChange={
                props.onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>
              }
              placeholder={props.placeholder}
              disabled={props.disabled}
            />
          ) : (
            <input
              ref={ref}
              type={type}
              className={cn(
                'input-field',
                inputSize !== 'md' && `input-${inputSize}`,
                pill && 'input-pill',
                Boolean(icon) && 'input-has-icon-left',
                Boolean(rightElement) && 'input-has-right',
                Boolean(error) && 'has-error',
                className,
              )}
              {...props}
            />
          )}

          {rightElement && (
            <div className="input-right-element">{rightElement}</div>
          )}
        </div>

        {error && <span className="input-error-text">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
