import React, { useState } from 'react';
import { Calendar, Clock, Phone, User } from 'lucide-react';
import { createAppointment } from '../../api/appointments';
import type { AppointmentType, PropertyRecord, UserSession } from '../../types';
import { formatTurkishPhone } from '../../utils/formatters';
import { Button, Input, Modal, Select } from '../core';

export interface AppointmentModalProps {
  property: PropertyRecord | null;
  session: UserSession;
  onClose: () => void;
  onBooked: (msg: string) => void;
  onRequireAuth: () => void;
}

const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

export function AppointmentModal({
  property,
  session,
  onClose,
  onBooked,
  onRequireAuth,
}: AppointmentModalProps) {
  const tomorrowIso = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);

  const [date, setDate] = useState(tomorrowIso);
  const [slot, setSlot] = useState('14:00');
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>('FIZIKI');
  const [customerName, setCustomerName] = useState(
    session.role !== 'VISITOR' ? session.full_name : '',
  );
  const [customerPhone, setCustomerPhone] = useState(
    session.role !== 'VISITOR' ? session.phone : '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!property) return null;

  const handleSubmit = async () => {
    if (session.role === 'VISITOR') {
      onClose();
      onRequireAuth();
      return;
    }
    const nameClean = (customerName || session.full_name).trim();
    const phoneClean = (customerPhone || session.phone).trim();
    if (!nameClean || !phoneClean) {
      setError('Lütfen ad soyad ve telefon numarası giriniz.');
      return;
    }

    const startHour = Number(slot.split(':')[0]);
    const endSlot = `${String(startHour + 1).padStart(2, '0')}:00`;
    const startIso = `${date}T${slot}:00`;
    const endIso = `${date}T${endSlot}:00`;

    setSubmitting(true);
    setError(null);
    try {
      const res = await createAppointment({
        agency_id: property.agency_id || 1,
        property_id: property.id,
        user_id: session.id,
        customer_name: nameClean,
        customer_phone: phoneClean,
        appointment_type: appointmentType,
        purpose: 'ILAN_GOSTERIMI',
        start_time: startIso,
        end_time: endIso,
        meeting_notes:
          notes.trim() || `${property.title} için yerinde gösterim talebi.`,
      });
      onBooked(res.message);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Randevu oluşturulamadı.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(property)}
      onClose={onClose}
      title="Yerinde Gösterim Randevusu Oluştur"
      size="sm"
      footer={
        <>
          <Button variant="outline" pill onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            pill
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Kaydediliyor...' : 'Randevuyu Onayla'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-surface-alt)',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 700 }}>{property.title}</div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {property.district} / {property.city} •{' '}
            {property.agency?.name ?? 'Başkent Vizyon Gayrimenkul'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Randevu Tarihi"
            type="date"
            min={tomorrowIso}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            icon={<Calendar size={15} />}
          />
          <Select
            label="Saat Dilimi"
            value={slot}
            onChange={setSlot}
            options={TIME_SLOTS.map((s) => ({
              value: s,
              label: `${s} - ${String(Number(s.slice(0, 2)) + 1).padStart(2, '0')}:00`,
            }))}
          />
        </div>

        <Select
          label="Görüşme Şekli"
          value={appointmentType}
          onChange={(v) => setAppointmentType(v as AppointmentType)}
          options={[
            { value: 'FIZIKI', label: 'Yerinde Fiziki Konut Gösterimi' },
            { value: 'TELEFON', label: 'Telefon / Online Ön Bilgilendirme' },
          ]}
        />

        <Input
          label="Adınız Soyadınız"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          icon={<User size={15} />}
          placeholder="Ad Soyad"
        />

        <Input
          label="Cep Telefonunuz"
          value={customerPhone}
          onChange={(e) =>
            setCustomerPhone(formatTurkishPhone(e.target.value))
          }
          icon={<Phone size={15} />}
          placeholder="0 (5XX) XXX XX XX"
        />

        <Input
          label="Danışmana Notunuz (Opsiyonel)"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Örn: Hafta sonu saat 14:00'te ailemle görmek istiyorum..."
        />

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AppointmentModal;
