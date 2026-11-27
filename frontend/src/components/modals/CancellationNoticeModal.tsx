import React, { useState } from 'react';
import { AlertTriangle, CalendarX2 } from 'lucide-react';
import { dismissCancellationNotice } from '../../api/appointments';
import type { CalendarAppointmentRecord } from '../../types';
import { formatDateTimeTR } from '../../utils/formatters';
import { Button, Modal } from '../core';

export interface CancellationNoticeModalProps {
  pending: CalendarAppointmentRecord | null;
  onRemindLater: () => void;
  onDismissed: (msg: string) => void;
}

/**
 * Müşteri bir randevuyu iptal ettiğinde sorumlu danışmanın / emlak ofisinin ekranına düşen bilgilendirme modalı.
 */
export function CancellationNoticeModal({
  pending,
  onRemindLater,
  onDismissed,
}: CancellationNoticeModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!pending) return null;

  const handleDismissForever = async () => {
    setSubmitting(true);
    try {
      await dismissCancellationNotice(pending.id);
      onDismissed('İptal bildirimi okundu olarak işaretlendi.');
    } catch {
      onRemindLater();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pending)}
      onClose={onRemindLater}
      title="Randevu İptal Bildirimi"
      size="sm"
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            pill
            disabled={submitting}
            onClick={() => void handleDismissForever()}
          >
            Bir Daha Gösterme
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              pill
              disabled={submitting}
              onClick={onRemindLater}
            >
              Daha Sonra
            </Button>
            <Button
              variant="primary"
              size="sm"
              pill
              disabled={submitting}
              onClick={() => void handleDismissForever()}
            >
              Anlaşıldı
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
          }}
        >
          <CalendarX2 size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 800 }}>
              Müşteri Randevusunu İptal Etti
            </div>
            <div>
              <strong>{pending.customer_name}</strong> ({pending.customer_phone})
              isimli müşteri planlı görüşmesini iptal etmiştir.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-surface-alt)',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div>
            <strong>İlan:</strong>{' '}
            {pending.property_title || 'Gayrimenkul Gösterimi'}
          </div>
          <div>
            <strong>Randevu Tarihi:</strong> {formatDateTimeTR(pending.start_time)}
          </div>
          <div>
            <strong>Sorumlu Danışman:</strong> {pending.advisor_name || 'Belirtilmedi'}
          </div>
          {pending.cancel_reason && (
            <div
              style={{
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px solid var(--color-border-default)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '3px', color: 'var(--color-primary)' }} />
              <span>
                <strong>İptal Nedeni:</strong> {pending.cancel_reason}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default CancellationNoticeModal;
