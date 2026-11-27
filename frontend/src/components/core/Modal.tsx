import React, { useEffect, useState } from 'react';
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

/**
 * iOS Safari klavye açıldığında body position:fixed kullanmadan (hit-test koordinat
 * kaymasına yol açmadan) scroll kilidi ve visualViewport senkronizasyonu sağlar.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [locked]);
}

export function useVisualViewport(active: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || !window.visualViewport) {
      setBox(null);
      return;
    }
    const vv = window.visualViewport;
    const sync = () => {
      setBox({
        top: Math.max(0, Math.round(vv.offsetTop)),
        height: Math.round(vv.height),
      });
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [active]);

  return box;
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
  const vvBox = useVisualViewport(isOpen);

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
      style={
        vvBox
          ? {
              top: `${vvBox.top}px`,
              height: `${vvBox.height}px`,
              bottom: 'auto',
            }
          : undefined
      }
      onClick={onClose}
    >
      <div
        className={cn('modal-content', `modal-${size}`, className)}
        style={
          vvBox
            ? {
                maxHeight:
                  size === 'fullscreen'
                    ? `${vvBox.height}px`
                    : `${Math.max(240, vvBox.height - 20)}px`,
              }
            : undefined
        }
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
