import React, { useState } from 'react';
import { Award, Star } from 'lucide-react';
import { dismissPendingReview, submitAgencyReview } from '../../api/engagement';
import type { PendingReviewItem, UserSession } from '../../types';
import { formatDateTimeTR } from '../../utils/formatters';
import { Button, Input, Modal } from '../core';

export interface RatingModalProps {
  pending: PendingReviewItem | null;
  session: UserSession;
  onRemindLater: () => void;
  onCompleted: (msg: string) => void;
}

/**
 * Randevusu "Tamamlandı" olarak işaretlenen müşteriye oturum açılışında çıkan
 * doğrulanmış emlakçı görüşme değerlendirme modalı.
 */
export function RatingModal({
  pending,
  session,
  onRemindLater,
  onCompleted,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!pending) return null;

  const activeStar = hoveredStar ?? rating;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAgencyReview({
        appointment_id: pending.appointment_id,
        rating,
        comment: comment.trim(),
        user_id: session.id,
      });
      setComment('');
      onCompleted(res.message || 'Değerlendirmeniz yayınlandı, teşekkür ederiz!');
    } catch (err) {
      onCompleted(
        err instanceof Error ? err.message : 'Değerlendirme kaydedilemedi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissForever = async () => {
    setSubmitting(true);
    try {
      await dismissPendingReview(pending.appointment_id);
      onCompleted('Bu görüşme için değerlendirme isteği kapatıldı.');
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
      title="Görüşme & Tanıtım Değerlendirmesi"
      size="md"
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '10px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Gönderiliyor...' : 'Gönder'}
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
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-surface-alt)',
          }}
        >
          <Award size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {pending.agency_name}
            </div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              {pending.property_title || 'Gayrimenkul Gösterimi'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {pending.advisor_name ? `Danışman: ${pending.advisor_name} • ` : ''}
              {formatDateTimeTR(pending.start_time)}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
              color: 'var(--color-text-secondary)',
            }}
          >
            Danışman ve emlak ofisi hizmetini 1–5 arasında puanlayın
          </div>
          <div style={{ display: 'inline-flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                onClick={() => setRating(star)}
                aria-label={`${star} Yıldız`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  transform: activeStar >= star ? 'scale(1.12)' : 'scale(1)',
                  transition: 'transform 0.14s ease',
                }}
              >
                <Star
                  size={30}
                  fill={activeStar >= star ? '#f59e0b' : 'transparent'}
                  color={activeStar >= star ? '#f59e0b' : 'var(--color-text-muted)'}
                />
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Yorumunuz (Ofis Vitrininde Yayınlanır)"
          multiline
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Danışmanın ilgisi, sunum kalitesi ve yer gösterimi hakkındaki deneyiminizi yazın..."
        />
      </div>
    </Modal>
  );
}

export default RatingModal;
