import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';
import '../../css/core/Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const prevBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.position = prevBodyStyle.position;
      document.body.style.top = prevBodyStyle.top;
      document.body.style.left = prevBodyStyle.left;
      document.body.style.right = prevBodyStyle.right;
      document.body.style.width = prevBodyStyle.width;
      document.body.style.overflow = prevBodyStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  children,
  className,
}: ModalProps) {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'modal-overlay',
        size === 'fullscreen' && 'modal-overlay-fullscreen',
      )}
      onClick={onClose}
    >
      <div
        className={cn('modal-content', `modal-${size}`, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              pill
              onClick={onClose}
              aria-label="Kapat"
            >
              <X size={18} />
            </Button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
