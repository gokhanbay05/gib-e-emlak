import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Phone, ShieldCheck, User } from 'lucide-react';
import {
  createAppointment,
  fetchCalendarOverview,
} from '../../api/appointments';
import { verifyTcIdentity } from '../../api/engagement';
import { getPropertyAdvisor } from '../../lib/advisors';
import {
  getIstanbulWeekdayShort,
  toIstanbulDateKey,
  toIstanbulTimeHHMM,
} from '../../lib/utils';
import type {
  AppointmentType,
  BlockedSlotRecord,
  CalendarAppointmentRecord,
  PropertyRecord,
  UserSession,
} from '../../types';
import { formatDigitsOnly, formatTurkishPhone } from '../../utils/formatters';
import { isValidTcIdentityNo } from '../../utils/validation';
import { Button, Input, Modal, Select } from '../core';

export interface AppointmentModalProps {
  property: PropertyRecord | null;
  session: UserSession;
  onClose: () => void;
  onBooked: (msg: string) => void;
  onRequireAuth: () => void;
}

const DEFAULT_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

/**
 * Madde 8 & 9: Seçilen ilanın sorumlu danışmanının o günkü aktif randevularını,
 * kapalı saatlerini ve ofis çalışma günlerini +03:00 (Europe/Istanbul) olarak sorgulayan Randevu Modalı.
 */
export function AppointmentModal({
  property,
  session,
  onClose,
  onBooked,
  onRequireAuth,
}: AppointmentModalProps) {
  const tomorrowIso = toIstanbulDateKey(
    new Date(Date.now() + 86400000).toISOString(),
  );

  const [date, setDate] = useState(tomorrowIso);
  const [slot, setSlot] = useState('10:00');
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>('FIZIKI');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [tcVerified, setTcVerified] = useState(false);
  const [tcChecking, setTcChecking] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingAppts, setExistingAppts] = useState<
    CalendarAppointmentRecord[]
  >([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotRecord[]>([]);
  const [workingHours, setWorkingHours] = useState<{
    start_hour: number;
    end_hour: number;
    working_days: string[];
  }>({
    start_hour: 9,
    end_hour: 18,
    working_days: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  });

  const advisor = useMemo(
    () => (property ? getPropertyAdvisor(property) : null),
    [property],
  );

  useEffect(() => {
    if (session.role !== 'VISITOR') {
      setCustomerName(session.full_name || '');
      setCustomerPhone(session.phone || '');
    }
  }, [session, property]);

  useEffect(() => {
    if (!property) return;
    setError(null);
    void fetchCalendarOverview({
      agency_id: property.agency_id || 1,
      advisor_name: advisor?.full_name,
    })
      .then((res) => {
        setExistingAppts(res.appointments);
        setBlockedSlots(res.blocked_slots);
        if (res.working_hours) {
          setWorkingHours({
            start_hour: res.working_hours.start_hour,
            end_hour: res.working_hours.end_hour,
            working_days: res.working_hours.working_days ?? [
              'Pzt',
              'Sal',
              'Çar',
              'Per',
              'Cum',
              'Cmt',
            ],
          });
        }
      })
      .catch(() => {});
  }, [property, advisor?.full_name]);

  const timeSlots = useMemo(() => {
    const startH = Math.max(7, Math.min(20, workingHours.start_hour || 9));
    const endH = Math.max(startH + 1, Math.min(22, workingHours.end_hour || 18));
    const list: string[] = [];
    for (let h = startH; h < endH; h += 1) {
      list.push(`${String(h).padStart(2, '0')}:00`);
    }
    return list.length > 0 ? list : DEFAULT_SLOTS;
  }, [workingHours.start_hour, workingHours.end_hour]);

  const selectedWeekday = useMemo(() => getIstanbulWeekdayShort(date), [date]);
  const isWorkingDay = workingHours.working_days.includes(selectedWeekday);

  // Seçilen tarihte dolu olan saatleri (+03:00 Türkiye saatiyle) hesapla
  const occupiedHours = useMemo(() => {
    const taken = new Set<string>();
    for (const appt of existingAppts) {
      if (appt.status === 'AKTIF' && toIstanbulDateKey(appt.start_time) === date) {
        const hh = toIstanbulTimeHHMM(appt.start_time).slice(0, 2);
        taken.add(`${hh}:00`);
      }
    }
    for (const blk of blockedSlots) {
      if (toIstanbulDateKey(blk.start_time) === date) {
        const hh = toIstanbulTimeHHMM(blk.start_time).slice(0, 2);
        taken.add(`${hh}:00`);
      }
    }
    return taken;
  }, [existingAppts, blockedSlots, date]);

  // Seçili saat doluysa veya aralık dışındaysa ilk müsait saati otomatik seç
  useEffect(() => {
    if (!timeSlots.includes(slot) || occupiedHours.has(slot)) {
      const firstFree = timeSlots.find((s) => !occupiedHours.has(s));
      if (firstFree) setSlot(firstFree);
    }
  }, [occupiedHours, slot, timeSlots]);

  if (!property) return null;

  const handleSubmit = async () => {
    if (session.role === 'VISITOR') {
      onClose();
      onRequireAuth();
      return;
    }
    if (!isWorkingDay) {
      setError(`Seçili gün (${selectedWeekday}) ofisin çalışma günleri dışındadır.`);
      return;
    }
    const nameClean = (customerName || session.full_name).trim();
    const phoneClean = (customerPhone || session.phone).trim();
    if (!nameClean || !phoneClean) {
      setError('Lütfen ad soyad ve telefon numarası giriniz.');
      return;
    }
    if (!isValidTcIdentityNo(tcIdentityNo)) {
      setError(
        'Güvenlik ve sahtecilik önleme (BR-04) gereği geçerli 11 haneli T.C. Kimlik Numarası girmeniz zorunludur.',
      );
      return;
    }
    if (occupiedHours.has(slot)) {
      setError('Seçtiğiniz saat dilimi dolu. Lütfen müsait bir saat seçiniz.');
      return;
    }

    const startHour = Number(slot.split(':')[0]);
    const endSlot = `${String(startHour + 1).padStart(2, '0')}:00`;
    const startIso = `${date}T${slot}:00+03:00`;
    const endIso = `${date}T${endSlot}:00+03:00`;

    setSubmitting(true);
    setError(null);
    try {
      const res = await createAppointment({
        agency_id: property.agency_id || 1,
        property_id: property.id,
        user_id: session.id,
        advisor_name: advisor?.full_name,
        customer_name: nameClean,
        customer_phone: phoneClean,
        tc_identity_no: tcIdentityNo.trim(),
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
            {advisor ? ` • Danışman: ${advisor.full_name}` : ''}
          </div>
        </div>

        {!isWorkingDay && (
          <div
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-warning-bg, rgba(245,158,11,0.14))',
              color: '#b45309',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            Ofis seçili tarihte ({selectedWeekday}) kapalıdır. Lütfen çalışma günlerinden ({workingHours.working_days.join(', ')}) birini seçiniz.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
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
            options={timeSlots.map((s) => {
              const isTaken = occupiedHours.has(s);
              const endH = String(Number(s.slice(0, 2)) + 1).padStart(2, '0');
              return {
                value: s,
                label: isTaken
                  ? `${s} - ${endH}:00 (Dolu)`
                  : `${s} - ${endH}:00 (Müsait)`,
              };
            })}
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

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            <div style={{ flex: 1 }}>
              <Input
                label="T.C. Kimlik Numaranız"
                value={tcIdentityNo}
                maxLength={11}
                onChange={(e) => {
                  setTcIdentityNo(formatDigitsOnly(e.target.value, 11));
                  setTcVerified(false);
                }}
                icon={<ShieldCheck size={15} />}
                placeholder="11 haneli T.C. Kimlik No"
              />
            </div>
            <Button
              variant={tcVerified ? 'secondary' : 'outline'}
              size="sm"
              pill
              disabled={tcChecking || tcIdentityNo.length !== 11}
              style={{ flexShrink: 0, height: '40px' }}
              onClick={async () => {
                setTcChecking(true);
                setError(null);
                try {
                  const res = await verifyTcIdentity(tcIdentityNo);
                  if (res.is_valid) {
                    setTcVerified(true);
                  } else {
                    setError(res.message);
                  }
                } catch {
                  setError('Kimlik doğrulanamadı.');
                } finally {
                  setTcChecking(false);
                }
              }}
            >
              {tcVerified ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ffffff' }}>
                  <CheckCircle2 size={14} /> Doğrulandı
                </span>
              ) : tcChecking ? (
                'Sorgulanıyor...'
              ) : (
                'NVİ Doğrula'
              )}
            </Button>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Yer gösterimi güvenliği ve sahtecilik önleme için T.C. Kimlik doğrulaması zorunludur.
          </div>
        </div>

        <Input
          label="Danışmana Notunuz (Opsiyonel)"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Örn: Hafta sonu ailemle görmek istiyorum..."
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
