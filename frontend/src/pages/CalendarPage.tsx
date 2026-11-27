import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createBlockedSlot,
  deleteBlockedSlot,
  fetchCalendarOverview,
  updateAppointmentDetails,
} from '../api/appointments';
import {
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Tabs,
} from '../components/core';
import { PageContainer } from '../components/layout';
import { cn } from '../lib/utils';
import type {
  BlockedSlotRecord,
  CalendarAppointmentRecord,
  UserSession,
} from '../types';
import {
  formatAppointmentPurposeLabel,
  formatAppointmentStatusLabel,
  formatAppointmentTypeLabel,
  formatDateTimeTR,
} from '../utils/formatters';
import '../css/pages/CalendarPage.css';

export interface CalendarPageProps {
  session: UserSession;
  onNotify: (msg: string) => void;
}

const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function extractTimeHHMM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * macOS Apple Calendar mimarisinde Tam Sayfa 7 Sütunlu Aylık / Haftalık Randevu Takvimi.
 * Gün hücrelerinin içinde doğrudan renkli randevu ve kapalı saat hapları görünür;
 * tıklanınca detay/düzenleme veya tek seferde saat aralığı kapatma modalı açılır.
 */
export function CalendarPage({ session, onNotify }: CalendarPageProps) {
  const agencyId = session.agency?.id ?? 1;
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());

  const [appointments, setAppointments] = useState<CalendarAppointmentRecord[]>(
    [],
  );
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotRecord[]>([]);

  // Mesai Saatleri Ayarı
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [workModalOpen, setWorkModalOpen] = useState(false);

  // Seçili Randevu Düzenleme Modalı
  const [selectedAppt, setSelectedAppt] =
    useState<CalendarAppointmentRecord | null>(null);
  const [editStatus, setEditStatus] = useState('AKTIF');
  const [editNotes, setEditNotes] = useState('');

  // Saat Aralığı Kapatma Modalı
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(() => toDateKey(new Date()));
  const [blockStartHour, setBlockStartHour] = useState('12:00');
  const [blockEndHour, setBlockEndHour] = useState('14:00');
  const [blockReason, setBlockReason] = useState('Noter / Tapu Dairesi İşlemi');
  const [selectedBlockedSlot, setSelectedBlockedSlot] =
    useState<BlockedSlotRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCalendarData = async () => {
    try {
      const res = await fetchCalendarOverview({ agency_id: agencyId });
      setAppointments(res.appointments);
      setBlockedSlots(res.blocked_slots);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadCalendarData();
  }, [agencyId]);

  // Aylık 42 günlük (6 hafta x 7 gün) veya Haftalık 7 günlük ızgara hücrelerini üret
  const calendarDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();

    if (viewMode === 'week') {
      const dayOfWeek = (cursorDate.getDay() + 6) % 7; // Pzt = 0
      const monday = new Date(cursorDate);
      monday.setDate(cursorDate.getDate() - dayOfWeek);
      return Array.from({ length: 7 }, (_, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        return { date: d, inMonth: true };
      });
    }

    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Pzt = 0
    const gridStart = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + idx);
      return {
        date: d,
        inMonth: d.getMonth() === month,
      };
    });
  }, [cursorDate, viewMode]);

  // Tarih anahtarına göre randevu ve kapalı saatleri grupla
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        appointments: CalendarAppointmentRecord[];
        blocked: BlockedSlotRecord[];
      }
    > = {};

    for (const appt of appointments) {
      const key = appt.start_time.slice(0, 10);
      if (!map[key]) map[key] = { appointments: [], blocked: [] };
      map[key].appointments.push(appt);
    }

    for (const blk of blockedSlots) {
      const key = blk.start_time.slice(0, 10);
      if (!map[key]) map[key] = { appointments: [], blocked: [] };
      map[key].blocked.push(blk);
    }

    return map;
  }, [appointments, blockedSlots]);

  const handleNavigatePeriod = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setCursorDate(new Date());
      return;
    }
    const next = new Date(cursorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + dir);
    } else {
      next.setDate(next.getDate() + dir * 7);
    }
    setCursorDate(next);
  };

  const handleSaveAppointmentEdit = async () => {
    if (!selectedAppt) return;
    setSubmitting(true);
    try {
      const res = await updateAppointmentDetails(selectedAppt.id, {
        status: editStatus,
        meeting_notes: editNotes,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAppt.id ? res.appointment : a)),
      );
      setSelectedAppt(null);
      onNotify('Randevu durumu ve görüşme notu güncellendi.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Randevu güncellenemedi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBlockedRange = async () => {
    const startH = Number(blockStartHour.split(':')[0]);
    const endH = Number(blockEndHour.split(':')[0]);
    if (endH <= startH) {
      onNotify('Bitiş saati başlangıç saatinden büyük olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      for (let h = startH; h < endH; h++) {
        const sIso = `${blockDate}T${String(h).padStart(2, '0')}:00:00`;
        const eIso = `${blockDate}T${String(h + 1).padStart(2, '0')}:00:00`;
        await createBlockedSlot({
          agency_id: agencyId,
          start_time: sIso,
          end_time: eIso,
          reason: blockReason.trim() || 'Manuel Kapatılan Mesai Aralığı',
        });
      }
      await loadCalendarData();
      setBlockModalOpen(false);
      onNotify(
        `${blockDate} günü ${blockStartHour} - ${blockEndHour} aralığı randevuya kapatıldı.`,
      );
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Seçilen saat aralığında aktif randevu bulunduğu için kapatılamadı.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlocked = async (slotId: number) => {
    setSubmitting(true);
    try {
      await deleteBlockedSlot(slotId);
      setBlockedSlots((prev) => prev.filter((b) => b.id !== slotId));
      setSelectedBlockedSlot(null);
      onNotify('Kapalı saat aralığı tekrar randevuya açıldı.');
    } finally {
      setSubmitting(false);
    }
  };

  const todayKey = toDateKey(new Date());

  const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => {
    const h = String(8 + i).padStart(2, '0');
    return { value: `${h}:00`, label: `${h}:00` };
  });

  return (
    <PageContainer
      size="wide"
      title="Randevu Takvimi"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            pill
            leftIcon={<Clock size={14} />}
            onClick={() => setWorkModalOpen(true)}
          >
            Mesai Saatleri ({workStart} - {workEnd})
          </Button>
          <Button
            variant="primary"
            size="sm"
            pill
            leftIcon={<Plus size={15} />}
            onClick={() => {
              setBlockDate(toDateKey(cursorDate));
              setBlockModalOpen(true);
            }}
          >
            Saat Aralığı Kapat
          </Button>
        </>
      }
    >
      <div className="apple-cal-card">
        {/* Apple Calendar Üst Araç Çubuğu */}
        <div className="apple-cal-toolbar">
          <h2 className="apple-cal-month-title">
            {MONTHS_TR[cursorDate.getMonth()]}{' '}
            <span>{cursorDate.getFullYear()}</span>
          </h2>

          <Tabs
            variant="segmented"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'month' | 'week')}
            items={[
              { value: 'month', label: 'Ay Görünümü' },
              { value: 'week', label: 'Hafta Görünümü' },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleNavigatePeriod(-1)}
              aria-label="Önceki"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigatePeriod(0)}
            >
              Bugün
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleNavigatePeriod(1)}
              aria-label="Sonraki"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Haftanın Günleri Başlığı */}
        <div className="apple-cal-weekdays">
          {WEEKDAYS_TR.map((dayName) => (
            <div key={dayName} className="apple-cal-weekday-cell">
              {dayName}
            </div>
          ))}
        </div>

        {/* 7 Sütunlu Apple Calendar Gün Hücreleri Izgarası */}
        <div className="apple-cal-grid">
          {calendarDays.map(({ date, inMonth }) => {
            const key = toDateKey(date);
            const isToday = key === todayKey;
            const dayOfWeek = (date.getDay() + 6) % 7;
            const isWeekend = dayOfWeek >= 5;
            const dayEvents = eventsByDate[key];

            return (
              <div
                key={key}
                className={cn(
                  'apple-cal-day-cell',
                  !inMonth && 'is-outside-month',
                  isWeekend && 'is-weekend',
                )}
                onClick={() => {
                  setBlockDate(key);
                  setBlockModalOpen(true);
                }}
              >
                <div className="apple-cal-day-top">
                  <span
                    className={cn(
                      'apple-cal-day-num',
                      isToday && 'is-today',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="apple-cal-events-stack">
                  {dayEvents?.appointments.map((appt) => {
                    const pillClass =
                      appt.status === 'TAMAMLANDI'
                        ? 'type-completed'
                        : appt.status === 'IPTAL_EDILDI'
                          ? 'type-cancelled'
                          : 'type-active';
                    return (
                      <button
                        key={`appt-${appt.id}`}
                        type="button"
                        className={cn('apple-cal-event-pill', pillClass)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppt(appt);
                          setEditStatus(appt.status);
                          setEditNotes(appt.meeting_notes || '');
                        }}
                        title={`${appt.customer_name} — ${appt.property_title}`}
                      >
                        <span className="apple-cal-event-title">
                          ● {appt.customer_name}
                        </span>
                        <span className="apple-cal-event-time">
                          {extractTimeHHMM(appt.start_time)}
                        </span>
                      </button>
                    );
                  })}

                  {dayEvents?.blocked.map((blk) => (
                    <button
                      key={`blk-${blk.id}`}
                      type="button"
                      className="apple-cal-event-pill type-blocked"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockedSlot(blk);
                      }}
                      title={`Kapalı: ${blk.reason}`}
                    >
                      <span className="apple-cal-event-title">
                        Kapalı: {blk.reason}
                      </span>
                      <span className="apple-cal-event-time">
                        {extractTimeHHMM(blk.start_time)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal 1: Randevu Detayı ve Görüşme Notu Düzenleme */}
      <Modal
        isOpen={Boolean(selectedAppt)}
        onClose={() => setSelectedAppt(null)}
        title="Randevu Detayı ve Durum Güncelleme"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setSelectedAppt(null)}
            >
              Kapat
            </Button>
            <Button
              variant="primary"
              pill
              disabled={submitting}
              onClick={() => void handleSaveAppointmentEdit()}
            >
              {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </>
        }
      >
        {selectedAppt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '15px' }}>
                {selectedAppt.customer_name} ({selectedAppt.customer_phone})
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-body)' }}>
                {selectedAppt.property_title ||
                  formatAppointmentPurposeLabel(selectedAppt.purpose)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {formatDateTimeTR(selectedAppt.start_time)} •{' '}
                {formatAppointmentTypeLabel(selectedAppt.appointment_type)}
              </div>
            </div>

            <Select
              label="Randevu Durumu"
              value={editStatus}
              onChange={setEditStatus}
              options={[
                { value: 'AKTIF', label: 'Aktif / Planlandı' },
                { value: 'TAMAMLANDI', label: 'Görüşme Tamamlandı' },
                { value: 'IPTAL_EDILDI', label: 'İptal Edildi' },
              ]}
            />

            <Input
              label="Görüşme Notu"
              multiline
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Müşteri geri bildirimi veya teklif notları..."
            />
          </div>
        )}
      </Modal>

      {/* Modal 2: Tek Seferde Saat Aralığı Kapatma */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Takvimde Saat Aralığı Kapat"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setBlockModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              pill
              leftIcon={<Lock size={14} />}
              disabled={submitting}
              onClick={() => void handleCreateBlockedRange()}
            >
              {submitting ? 'Kapatılıyor...' : 'Seçili Aralığı Kapat'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Tarih"
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Başlangıç Saati"
              value={blockStartHour}
              onChange={setBlockStartHour}
              options={HOUR_OPTIONS}
            />
            <Select
              label="Bitiş Saati"
              value={blockEndHour}
              onChange={setBlockEndHour}
              options={HOUR_OPTIONS}
            />
          </div>
          <Input
            label="Kapatma Nedeni / Açıklama"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Örn: Tapu Dairesi Randevusu / Öğle Arası"
          />
        </div>
      </Modal>

      {/* Modal 3: Kapatılan Saati Tekrar Açma */}
      <Modal
        isOpen={Boolean(selectedBlockedSlot)}
        onClose={() => setSelectedBlockedSlot(null)}
        title="Kapalı Saat Dilimi"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setSelectedBlockedSlot(null)}
            >
              Kapat
            </Button>
            {selectedBlockedSlot && (
              <Button
                variant="danger"
                pill
                leftIcon={<Trash2 size={14} />}
                disabled={submitting}
                onClick={() => void handleDeleteBlocked(selectedBlockedSlot.id)}
              >
                Kilidi Kaldır (Randevuya Aç)
              </Button>
            )}
          </>
        }
      >
        {selectedBlockedSlot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Badge variant="warning">Randevuya Kapalı</Badge>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>
              {selectedBlockedSlot.reason}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Başlangıç: {formatDateTimeTR(selectedBlockedSlot.start_time)}
              <br />
              Bitiş: {formatDateTimeTR(selectedBlockedSlot.end_time)}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 4: Kurumsal Mesai Saatleri Ayarı */}
      <Modal
        isOpen={workModalOpen}
        onClose={() => setWorkModalOpen(false)}
        title="Kurumsal Mesai Saatleri"
        size="sm"
        footer={
          <Button
            variant="primary"
            pill
            onClick={() => {
              setWorkModalOpen(false);
              onNotify(
                `Ofis mesai saatleri ${workStart} - ${workEnd} olarak güncellendi.`,
              );
            }}
          >
            Mesai Saatlerini Kaydet
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select
            label="Mesai Başlangıcı"
            value={workStart}
            onChange={setWorkStart}
            options={HOUR_OPTIONS}
          />
          <Select
            label="Mesai Bitişi"
            value={workEnd}
            onChange={setWorkEnd}
            options={HOUR_OPTIONS}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}

export default CalendarPage;
