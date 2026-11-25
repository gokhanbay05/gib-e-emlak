import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { fetchAgencies } from '../api/agencies';
import {
  createBlockedSlot,
  deleteBlockedSlot,
  fetchCalendarOverview,
} from '../api/appointments';
import { ApiError } from '../api/client';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  AgencyRecord,
  BlockedSlotRecord,
  CalendarAppointmentRecord,
  CalendarCounts,
  UserSession,
} from '../types';
import {
  formatAppointmentPurposeLabel,
  formatAppointmentStatusLabel,
  formatAppointmentTypeLabel,
  formatCustomerTypeLabel,
  formatDateTimeTR,
  formatDateTR,
  formatTurkishPhone,
} from '../utils/formatters';

interface CalendarPageProps {
  currentUser: UserSession;
  onNavigateAuth: () => void;
  onDataChanged?: () => void;
}

type DateInputValue = NonNullable<ComponentProps<typeof DateInput>['value']>;

const CALENDAR_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const START_HOUR_OPTIONS = CALENDAR_HOURS.map((h) => ({
  value: String(h).padStart(2, '0'),
  label: `${String(h).padStart(2, '0')}:00`,
}));

const END_HOUR_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(
  (h) => ({
    value: String(h).padStart(2, '0'),
    label: `${String(h).padStart(2, '0')}:00`,
  }),
);

const QUICK_BLOCK_REASONS = [
  '19:00 - 20:00 Akşam Saatleri Manuel Kapalı',
  'Tapu Müdürlüğü Randevusu',
  'Ofis Dışı Ekspertiz ve Yer Gösterimi',
  'Öğle Arası / İdari Toplantı',
];

const SHORT_DAY_NAMES_MON_FIRST = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const EMPTY_COUNTS: CalendarCounts = {
  total_appointments: 0,
  active_appointments: 0,
  completed_appointments: 0,
  cancelled_appointments: 0,
  blocked_slots_count: 0,
};

interface HourSlotRow {
  [key: string]: unknown;
  id: number;
  hour: number;
  hourLabel: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatHourRange(hour: number): string {
  return `${pad2(hour)}:00 - ${pad2(hour + 1)}:00`;
}

function toIsoDate(date: Date): DateInputValue {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}` as DateInputValue;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMondayOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatShortDayHeader(date: Date, index: number): string {
  const name = SHORT_DAY_NAMES_MON_FIRST[index] ?? '';
  return `${name} ${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

function formatFullDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);
}

function findSlotEvents(
  dayDate: Date,
  hour: number,
  appointments: CalendarAppointmentRecord[],
  blockedSlots: BlockedSlotRecord[],
): {
  appointment: CalendarAppointmentRecord | null;
  blockedSlot: BlockedSlotRecord | null;
} {
  const cellStart = new Date(
    dayDate.getFullYear(),
    dayDate.getMonth(),
    dayDate.getDate(),
    hour,
    0,
    0,
    0,
  ).getTime();
  const cellEnd = new Date(
    dayDate.getFullYear(),
    dayDate.getMonth(),
    dayDate.getDate(),
    hour + 1,
    0,
    0,
    0,
  ).getTime();

  const matchingAppointments = appointments.filter((appt) => {
    if (appt.status === 'IPTAL_EDILDI') return false;
    const s = new Date(appt.start_time).getTime();
    const e = new Date(appt.end_time).getTime();
    return s < cellEnd && e > cellStart;
  });

  const activeAppt =
    matchingAppointments.find((a) => a.status === 'AKTIF') ??
    matchingAppointments[0] ??
    null;

  const matchingBlocked =
    blockedSlots.find((slot) => {
      const s = new Date(slot.start_time).getTime();
      const e = new Date(slot.end_time).getTime();
      return s < cellEnd && e > cellStart;
    }) ?? null;

  return {
    appointment: activeAppt,
    blockedSlot: matchingBlocked,
  };
}

/**
 * Randevu Takvimi ve Müsaitlik Yönetimi (P8):
 * Google Calendar tarzı 09:00–21:00 haftalık ve günlük saat dilimi görünümü,
 * BR-06 çakışma korumalı manuel saat kapatma/kilit açma ve randevu detay yan paneli.
 */
export function CalendarPage({
  currentUser,
  onNavigateAuth,
  onDataChanged,
}: CalendarPageProps) {
  const showToast = useToast();
  const isAgent = currentUser.role === 'AGENT' && currentUser.agency !== null;

  // İşletme seçimi (Emlakçı kendi işletmesini yönetir; ziyaretçi/müşteri ofis seçip müsaitlik görür)
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(
    currentUser.role === 'AGENT' && currentUser.agency
      ? currentUser.agency.id
      : 1,
  );

  // Takvim verileri
  const [appointments, setAppointments] = useState<CalendarAppointmentRecord[]>(
    [],
  );
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotRecord[]>([]);
  const [counts, setCounts] = useState<CalendarCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);

  // Görünüm ve tarih navigasyonu
  const [viewMode, setViewMode] = useState<string>('WEEK');
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    startOfDay(new Date()),
  );

  // Manuel saat kapatma modal durumları
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState<DateInputValue>(() =>
    toIsoDate(new Date()),
  );
  const [blockStartHour, setBlockStartHour] = useState<string>('19');
  const [blockEndHour, setBlockEndHour] = useState<string>('20');
  const [blockReason, setBlockReason] = useState<string>(
    '19:00 - 20:00 Akşam Saatleri Manuel Kapalı',
  );
  const [blockError, setBlockError] = useState<string>('');
  const [blockFieldErrors, setBlockFieldErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<number | null>(null);

  // Randevu detay Drawer
  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarAppointmentRecord | null>(null);

  useEffect(() => {
    if (currentUser.role === 'AGENT' && currentUser.agency) {
      setSelectedAgencyId(currentUser.agency.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isAgent) return;
    let isCancelled = false;
    void fetchAgencies()
      .then((res) => {
        if (isCancelled) return;
        setAgencies(res.agencies);
        if (
          res.agencies.length > 0 &&
          !res.agencies.some((a) => a.id === selectedAgencyId)
        ) {
          setSelectedAgencyId(res.agencies[0].id);
        }
      })
      .catch(() => {
        // offline fallback
      });
    return () => {
      isCancelled = true;
    };
  }, [isAgent, selectedAgencyId]);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCalendarOverview({ agency_id: selectedAgencyId });
      setAppointments(data.appointments);
      setBlockedSlots(data.blocked_slots);
      setCounts(data.counts);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Takvim verileri yüklenirken sunucu bağlantısı kurulamadı.';
      showToast({ body: message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgencyId, showToast]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, idx) => addDays(monday, idx));
  }, [anchorDate]);

  const hourRows: HourSlotRow[] = useMemo(
    () =>
      CALENDAR_HOURS.map((hour) => ({
        id: hour,
        hour,
        hourLabel: formatHourRange(hour),
      })),
    [],
  );

  const activeAgencyName = useMemo(() => {
    if (currentUser.role === 'AGENT' && currentUser.agency) {
      return currentUser.agency.name;
    }
    const found = agencies.find((a) => a.id === selectedAgencyId);
    return found ? found.name : `Emlak İşletmesi #${selectedAgencyId}`;
  }, [agencies, currentUser, selectedAgencyId]);

  const agencyOptions = useMemo(
    () =>
      agencies.map((a) => ({
        value: String(a.id),
        label: `${a.name} (${a.district || a.city || 'Yetki Belgeli'})`,
      })),
    [agencies],
  );

  const outOfHoursItems = useMemo(() => {
    const outsideAppointments = appointments.filter((a) => {
      if (a.status === 'IPTAL_EDILDI') return false;
      const h = new Date(a.start_time).getHours();
      return h < 9 || h >= 21;
    });
    const outsideBlocked = blockedSlots.filter((b) => {
      const h = new Date(b.start_time).getHours();
      return h < 9 || h >= 21;
    });
    return {
      appointments: outsideAppointments,
      blockedSlots: outsideBlocked,
    };
  }, [appointments, blockedSlots]);

  const openBlockDialog = (targetDate?: Date, startHour?: number) => {
    const chosenDate = targetDate ?? anchorDate;
    const chosenHour = startHour ?? 19;
    const endHour = Math.min(21, chosenHour + 1);
    setBlockDate(toIsoDate(chosenDate));
    setBlockStartHour(pad2(chosenHour));
    setBlockEndHour(pad2(endHour));
    setBlockReason(
      chosenHour === 19
        ? '19:00 - 20:00 Akşam Saatleri Manuel Kapalı'
        : `${pad2(chosenHour)}:00 - ${pad2(endHour)}:00 Manuel Kapalı`,
    );
    setBlockError('');
    setBlockFieldErrors({});
    setIsBlockDialogOpen(true);
  };

  const handleSubmitBlockSlot = async () => {
    if (!isAgent || !currentUser.agency) {
      showToast({
        body: 'Saat kapatma işlemi yalnızca emlak işletmesi hesabı ile yapılabilir.',
        type: 'error',
      });
      return;
    }

    setBlockError('');
    setBlockFieldErrors({});

    if (!blockDate) {
      setBlockFieldErrors({ date: 'Lütfen bir tarih seçiniz.' });
      return;
    }

    const startNum = Number(blockStartHour);
    const endNum = Number(blockEndHour);
    if (Number.isNaN(startNum) || Number.isNaN(endNum) || endNum <= startNum) {
      const msg = 'Bitiş saati başlangıç saatinden sonra olmalıdır.';
      setBlockError(msg);
      setBlockFieldErrors({ end_time: msg });
      return;
    }

    const [y, m, d] = blockDate.split('-').map(Number);
    const startDt = new Date(y, m - 1, d, startNum, 0, 0, 0);
    const endDt = new Date(y, m - 1, d, endNum, 0, 0, 0);

    setIsSubmittingBlock(true);
    try {
      const res = await createBlockedSlot({
        agency_id: currentUser.agency.id,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        reason: blockReason.trim() || 'Emlakçı Manuel Kapattı',
      });
      showToast({ body: res.message, type: 'info' });
      setIsBlockDialogOpen(false);
      await loadCalendar();
      onDataChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setBlockError(err.message);
        setBlockFieldErrors(err.fieldErrors);
        showToast({ body: err.message, type: 'error' });
      } else {
        const msg = 'Saat dilimi kapatılırken sunucuya bağlanılamadı.';
        setBlockError(msg);
        showToast({ body: msg, type: 'error' });
      }
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleDeleteBlockedSlot = async (slotId: number) => {
    if (!isAgent) return;
    setDeletingSlotId(slotId);
    try {
      const res = await deleteBlockedSlot(slotId);
      showToast({ body: res.message, type: 'info' });
      await loadCalendar();
      onDataChanged?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Saat kilidi kaldırılırken hata oluştu.';
      showToast({ body: msg, type: 'error' });
    } finally {
      setDeletingSlotId(null);
    }
  };

  const handleNavigateRange = (direction: 'prev' | 'today' | 'next') => {
    if (direction === 'today') {
      setAnchorDate(startOfDay(new Date()));
      return;
    }
    const step = viewMode === 'WEEK' ? 7 : 1;
    setAnchorDate((prev) =>
      addDays(prev, direction === 'next' ? step : -step),
    );
  };

  const dateHeaderLabel =
    viewMode === 'WEEK'
      ? `${formatDateTR(weekDays[0].toISOString())} – ${formatDateTR(weekDays[6].toISOString())}`
      : formatFullDayLabel(anchorDate);

  const weeklyColumns: TableColumn<HourSlotRow>[] = [
    {
      key: 'hourLabel',
      header: 'Saat Dilimi',
      renderCell: (row) => (
        <VStack gap={0}>
          <Text weight="semibold" size="sm">
            {row.hourLabel}
          </Text>
          <Text color="secondary" size="sm">
            1 Saat
          </Text>
        </VStack>
      ),
    },
    ...weekDays.map((dayDate, dayIdx): TableColumn<HourSlotRow> => ({
      key: `day_${dayIdx}`,
      header: formatShortDayHeader(dayDate, dayIdx),
      renderCell: (row) => {
        const { appointment, blockedSlot } = findSlotEvents(
          dayDate,
          row.hour,
          appointments,
          blockedSlots,
        );

        if (appointment) {
          const shortTitle =
            appointment.property_title.length > 26
              ? `${appointment.property_title.slice(0, 26)}…`
              : appointment.property_title;
          return (
            <VStack gap={0.5}>
              <Token
                label={
                  appointment.status === 'AKTIF'
                    ? 'Aktif Randevu'
                    : 'Tamamlandı'
                }
                size="sm"
              />
              <Text weight="semibold" size="sm">
                {appointment.customer_name}
              </Text>
              <Text color="secondary" size="sm">
                {appointment.appointment_type === 'FIZIKI'
                  ? 'Fiziki Gösterim'
                  : 'Telefon'}
              </Text>
              {shortTitle && (
                <Text color="secondary" size="sm">
                  {shortTitle}
                </Text>
              )}
              <Button
                label="Detay"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAppointment(appointment)}
              />
            </VStack>
          );
        }

        if (blockedSlot) {
          return (
            <VStack gap={0.5}>
              <Token label="KAPALI / MEŞGUL" size="sm" />
              <Text color="secondary" size="sm">
                {blockedSlot.reason}
              </Text>
              {isAgent && (
                <Button
                  label="Kilidi Aç (Müsait Yap)"
                  variant="ghost"
                  size="sm"
                  isLoading={deletingSlotId === blockedSlot.id}
                  onClick={() => void handleDeleteBlockedSlot(blockedSlot.id)}
                />
              )}
            </VStack>
          );
        }

        return (
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Müsait
            </Text>
            {isAgent && (
              <Button
                label="Bu Saati Kapat"
                variant="secondary"
                size="sm"
                onClick={() => openBlockDialog(dayDate, row.hour)}
              />
            )}
          </VStack>
        );
      },
    })),
  ];

  const dailyColumns: TableColumn<HourSlotRow>[] = [
    {
      key: 'hourLabel',
      header: 'Saat Dilimi',
      renderCell: (row) => (
        <Text weight="semibold">{row.hourLabel}</Text>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      renderCell: (row) => {
        const { appointment, blockedSlot } = findSlotEvents(
          anchorDate,
          row.hour,
          appointments,
          blockedSlots,
        );
        if (appointment) {
          return (
            <Token
              label={
                appointment.status === 'AKTIF'
                  ? 'Aktif Randevu (BR-06 Kilitli)'
                  : formatAppointmentStatusLabel(appointment.status)
              }
              size="sm"
            />
          );
        }
        if (blockedSlot) {
          return <Token label="KAPALI / MEŞGUL" size="sm" />;
        }
        return <Token label="Müsait" size="sm" />;
      },
    },
    {
      key: 'summary',
      header: 'Müşteri / Kapatma Nedeni',
      renderCell: (row) => {
        const { appointment, blockedSlot } = findSlotEvents(
          anchorDate,
          row.hour,
          appointments,
          blockedSlots,
        );
        if (appointment) {
          return (
            <VStack gap={0}>
              <Text weight="semibold">{appointment.customer_name}</Text>
              <Text color="secondary" size="sm">
                {formatTurkishPhone(appointment.customer_phone)}
              </Text>
            </VStack>
          );
        }
        if (blockedSlot) {
          return <Text>{blockedSlot.reason}</Text>;
        }
        return (
          <Text color="secondary" size="sm">
            Randevu veya kapatma kaydı yok
          </Text>
        );
      },
    },
    {
      key: 'details',
      header: 'İlgili İlan & Randevu Türü',
      renderCell: (row) => {
        const { appointment, blockedSlot } = findSlotEvents(
          anchorDate,
          row.hour,
          appointments,
          blockedSlots,
        );
        if (appointment) {
          return (
            <VStack gap={0}>
              <Text size="sm">
                {`${formatAppointmentTypeLabel(appointment.appointment_type)} · ${formatAppointmentPurposeLabel(appointment.purpose)}`}
              </Text>
              <Text color="secondary" size="sm">
                {appointment.property_title || 'Genel Danışmanlık'}
              </Text>
            </VStack>
          );
        }
        if (blockedSlot) {
          return (
            <Text color="secondary" size="sm">
              Emlakçı tarafından manuel bloklandı
            </Text>
          );
        }
        return <Text color="secondary">-</Text>;
      },
    },
    {
      key: 'actions',
      header: 'İşlem',
      renderCell: (row) => {
        const { appointment, blockedSlot } = findSlotEvents(
          anchorDate,
          row.hour,
          appointments,
          blockedSlots,
        );
        if (appointment) {
          return (
            <Button
              label="Randevu Detayı"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedAppointment(appointment)}
            />
          );
        }
        if (blockedSlot) {
          return isAgent ? (
            <Button
              label="Kilidi Aç (Müsait Yap)"
              variant="ghost"
              size="sm"
              isLoading={deletingSlotId === blockedSlot.id}
              onClick={() => void handleDeleteBlockedSlot(blockedSlot.id)}
            />
          ) : (
            <Text color="secondary" size="sm">
              Kapalı
            </Text>
          );
        }
        return isAgent ? (
          <Button
            label="Bu Saati Kapat"
            variant="secondary"
            size="sm"
            onClick={() => openBlockDialog(anchorDate, row.hour)}
          />
        ) : (
          <Text color="secondary" size="sm">
            Müsait
          </Text>
        );
      },
    },
  ];

  const blockedSlotColumns: TableColumn<BlockedSlotRecord>[] = [
    {
      key: 'start_time',
      header: 'Kapalı Tarih & Saat Aralığı',
      renderCell: (slot) => (
        <VStack gap={0}>
          <Text weight="semibold">{formatDateTimeTR(slot.start_time)}</Text>
          <Text color="secondary" size="sm">
            {`Bitiş: ${formatDateTimeTR(slot.end_time)}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'reason',
      header: 'Kapatma Nedeni',
      renderCell: (slot) => <Text>{slot.reason}</Text>,
    },
    {
      key: 'created_at',
      header: 'Kayıt Tarihi',
      renderCell: (slot) => (
        <Text color="secondary" size="sm">
          {formatDateTimeTR(slot.created_at)}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      renderCell: (slot) =>
        isAgent ? (
          <Button
            label="Kilidi Aç (Müsait Yap)"
            variant="ghost"
            size="sm"
            isLoading={deletingSlotId === slot.id}
            onClick={() => void handleDeleteBlockedSlot(slot.id)}
          />
        ) : (
          <Token label="KAPALI / MEŞGUL" size="sm" />
        ),
    },
  ];

  const appointmentListColumns: TableColumn<CalendarAppointmentRecord>[] = [
    {
      key: 'start_time',
      header: 'Tarih ve Saat',
      renderCell: (appt) => (
        <VStack gap={0}>
          <Text weight="semibold">{formatDateTimeTR(appt.start_time)}</Text>
          <Text color="secondary" size="sm">
            {`Bitiş: ${formatDateTimeTR(appt.end_time)}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'customer_name',
      header: 'Müşteri',
      renderCell: (appt) => (
        <VStack gap={0}>
          <Text weight="semibold">{appt.customer_name}</Text>
          <Text color="secondary" size="sm">
            {`${formatCustomerTypeLabel(appt.customer_type)} · ${formatTurkishPhone(appt.customer_phone)}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'appointment_type',
      header: 'Tür ve Amaç',
      renderCell: (appt) => (
        <VStack gap={0}>
          <Text>{formatAppointmentTypeLabel(appt.appointment_type)}</Text>
          <Text color="secondary" size="sm">
            {formatAppointmentPurposeLabel(appt.purpose)}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'property_title',
      header: 'İlgili Gayrimenkul',
      renderCell: (appt) => (
        <VStack gap={0}>
          <Text size="sm">
            {appt.property_title || 'Genel Danışmanlık'}
          </Text>
          {appt.property_location && (
            <Text color="secondary" size="sm">
              {appt.property_location}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      renderCell: (appt) => (
        <Token label={formatAppointmentStatusLabel(appt.status)} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      renderCell: (appt) => (
        <Button
          label="Detay"
          variant="secondary"
          size="sm"
          onClick={() => setSelectedAppointment(appt)}
        />
      ),
    },
  ];

  return (
    <PageFrame
      title="Randevu Takvimi ve Müsaitlik Yönetimi"
      subtitle="Google Calendar tarzı haftalık ve günlük saat dilimli (09:00 – 21:00) emlak işletmesi takvimi, gerçek zamanlı müsaitlik takibi ve BR-06 çakışma korumalı manuel saat kapatma sistemi."
      action={
        isAgent ? (
          <Button
            label="+ Manuel Saat Kapat"
            variant="primary"
            onClick={() => openBlockDialog()}
          />
        ) : (
          <Button
            label="Emlakçı Girişi Yap"
            variant="secondary"
            size="sm"
            onClick={onNavigateAuth}
          />
        )
      }
    >
      {!isAgent && (
        <Banner
          status="info"
          collapsible={false}
          title="Müsaitlik Görüntüleme Modu"
          description="Seçilen emlak işletmesinin haftalık/günlük müsaitliğini ve kapalı saatlerini inceleyebilirsiniz. Manuel saat kapatma ve kilit açma işlemleri yalnızca emlak işletmesi (Emlakçı) hesabıyla yapılabilir."
        />
      )}

      {!isAgent && agencyOptions.length > 0 && (
        <Card padding={3}>
          <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
            <Selector
              label="Takvimi Görüntülenecek Emlak İşletmesi"
              value={String(selectedAgencyId)}
              options={agencyOptions}
              onChange={(val) => {
                if (val) setSelectedAgencyId(Number(val));
              }}
              width="100%"
            />
            <VStack gap={0.5} justify="center">
              <Text color="secondary" size="sm">
                Seçili Ofis
              </Text>
              <Text weight="semibold">{activeAgencyName}</Text>
            </VStack>
          </Grid>
        </Card>
      )}

      <Grid columns={{ minWidth: 220, max: 4 }} gap={3}>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Aktif Randevu Sayısı
            </Text>
            <Heading level={3}>{counts.active_appointments}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Manuel Kapalı Saat
            </Text>
            <Heading level={3}>{counts.blocked_slots_count}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Tamamlanan Randevu
            </Text>
            <Heading level={3}>{counts.completed_appointments}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Çalışma Saatleri
            </Text>
            <Heading level={3}>09:00 – 21:00</Heading>
          </VStack>
        </Card>
      </Grid>

      <VStack gap={3}>
        <TabList value={viewMode} onChange={setViewMode} hasDivider>
          <Tab value="WEEK" label="Haftalık Takvim Görünümü (7 Gün)" />
          <Tab value="DAY" label="Günlük Saat Dilimi Görünümü (09:00 – 21:00)" />
          <Tab
            value="BLOCKED"
            label={`Manuel Kapatılan Saatler & Randevu Listesi (${counts.blocked_slots_count + counts.total_appointments})`}
          />
        </TabList>

        {viewMode !== 'BLOCKED' && (
          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <HStack gap={1.5} vAlign="center" wrap="wrap">
              <Button
                label="Önceki"
                variant="secondary"
                size="sm"
                onClick={() => handleNavigateRange('prev')}
              />
              <Button
                label="Bugün"
                variant="secondary"
                size="sm"
                onClick={() => handleNavigateRange('today')}
              />
              <Button
                label="Sonraki"
                variant="secondary"
                size="sm"
                onClick={() => handleNavigateRange('next')}
              />
            </HStack>

            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={4}>{dateHeaderLabel}</Heading>
              <Button
                label="Yenile"
                variant="ghost"
                size="sm"
                isLoading={isLoading}
                onClick={() => void loadCalendar()}
              />
            </HStack>
          </HStack>
        )}

        {viewMode === 'WEEK' && (
          <HStack isScrollable width="100%">
            <Table
              data={hourRows}
              columns={weeklyColumns}
              idKey="id"
              dividers="grid"
              density="compact"
            />
          </HStack>
        )}

        {viewMode === 'DAY' && (
          <HStack isScrollable width="100%">
            <Table
              data={hourRows}
              columns={dailyColumns}
              idKey="id"
              dividers="rows"
              hasHover
            />
          </HStack>
        )}

        {viewMode === 'BLOCKED' && (
          <VStack gap={4}>
            <VStack gap={2}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <HStack gap={1.5} vAlign="center">
                  <Heading level={3}>Manuel Kapatılan Saat Dilimleri</Heading>
                  <Badge label={blockedSlots.length} />
                </HStack>
                {isAgent && (
                  <Button
                    label="+ Yeni Saat Kapat"
                    variant="secondary"
                    size="sm"
                    onClick={() => openBlockDialog()}
                  />
                )}
              </HStack>

              {blockedSlots.length === 0 ? (
                <EmptyState
                  title="Henüz manuel kapatılmış saat dilimi yok"
                  description="09:00 – 21:00 saatleri arasındaki herhangi bir müsait dilimi kapatarak randevu alımını durdurabilirsiniz."
                  isCompact
                />
              ) : (
                <HStack isScrollable width="100%">
                  <Table
                    data={blockedSlots}
                    columns={blockedSlotColumns}
                    idKey="id"
                    hasHover
                  />
                </HStack>
              )}
            </VStack>

            <Divider />

            <VStack gap={2}>
              <HStack gap={1.5} vAlign="center">
                <Heading level={3}>İşletme Randevuları</Heading>
                <Badge label={appointments.length} />
              </HStack>

              {appointments.length === 0 ? (
                <EmptyState
                  title="Kayıtlı randevu bulunmuyor"
                  description="Seçili emlak işletmesi için henüz oluşturulmuş bir randevu kaydı bulunmamaktadır."
                  isCompact
                />
              ) : (
                <HStack isScrollable width="100%">
                  <Table
                    data={appointments}
                    columns={appointmentListColumns}
                    idKey="id"
                    hasHover
                  />
                </HStack>
              )}
            </VStack>
          </VStack>
        )}

        {viewMode !== 'BLOCKED' &&
          (outOfHoursItems.appointments.length > 0 ||
            outOfHoursItems.blockedSlots.length > 0) && (
            <Banner
              status="info"
              collapsible={false}
              title="Mesai Saatleri Dışında Kayıtlı Etkinlikler"
              description={`09:00 – 21:00 takvim ızgarası dışında kalan ${outOfHoursItems.appointments.length} randevu ve ${outOfHoursItems.blockedSlots.length} manuel kapatılmış saat dilimi "Manuel Kapatılan Saatler & Randevu Listesi" sekmesinde listelenmektedir.`}
            />
          )}
      </VStack>

      {/* Manuel Saat Kapatma Modalı (BR-06 Çakışma Korumalı) */}
      <Dialog
        isOpen={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        purpose="form"
        width={520}
      >
        <Layout
          header={
            <DialogHeader
              title="Takvimde Saat Dilimini Manuel Kapat"
              subtitle="Seçilen tarih ve saat aralığı müşteri randevularına kapatılır. Aktif randevu varsa BR-06 gereği engellenir."
              onOpenChange={setIsBlockDialogOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                {blockError && (
                  <Banner
                    status="error"
                    collapsible={false}
                    title="BR-06 Saat Kapatma Engeli"
                    description={blockError}
                  />
                )}

                <DateInput
                  label="Tarih *"
                  value={blockDate}
                  weekStartsOn={1}
                  onChange={(val) => {
                    if (val) {
                      setBlockDate(val);
                      setBlockError('');
                      setBlockFieldErrors({});
                    }
                  }}
                  status={
                    blockFieldErrors.date
                      ? { type: 'error', message: blockFieldErrors.date }
                      : undefined
                  }
                  width="100%"
                />

                <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
                  <Selector
                    label="Başlangıç Saati *"
                    value={blockStartHour}
                    options={START_HOUR_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setBlockStartHour(val);
                        const nextEnd = Math.min(21, Number(val) + 1);
                        if (Number(blockEndHour) <= Number(val)) {
                          setBlockEndHour(pad2(nextEnd));
                        }
                        setBlockError('');
                        setBlockFieldErrors({});
                      }
                    }}
                    status={
                      blockFieldErrors.start_time
                        ? {
                            type: 'error',
                            message: blockFieldErrors.start_time,
                          }
                        : undefined
                    }
                    width="100%"
                  />

                  <Selector
                    label="Bitiş Saati *"
                    value={blockEndHour}
                    options={END_HOUR_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setBlockEndHour(val);
                        setBlockError('');
                        setBlockFieldErrors({});
                      }
                    }}
                    status={
                      blockFieldErrors.end_time
                        ? {
                            type: 'error',
                            message: blockFieldErrors.end_time,
                          }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <TextInput
                  label="Kapatma Nedeni *"
                  placeholder="Örn: 19:00 - 20:00 Akşam Saatleri Manuel Kapalı"
                  value={blockReason}
                  onChange={setBlockReason}
                  width="100%"
                />

                <VStack gap={1}>
                  <Text color="secondary" size="sm">
                    Hazır Kapatma Nedenleri:
                  </Text>
                  <HStack gap={1} wrap="wrap">
                    {QUICK_BLOCK_REASONS.map((preset) => (
                      <Button
                        key={preset}
                        label={preset}
                        variant="ghost"
                        size="sm"
                        onClick={() => setBlockReason(preset)}
                      />
                    ))}
                  </HStack>
                </VStack>

                <Text color="secondary" size="sm">
                  * işaretli alanlar zorunludur.
                </Text>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Vazgeç"
                  variant="secondary"
                  onClick={() => setIsBlockDialogOpen(false)}
                />
                <Button
                  label="Saat Dilimini Kapat"
                  variant="primary"
                  isLoading={isSubmittingBlock}
                  onClick={() => void handleSubmitBlockSlot()}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* Randevu Detayı Yan Paneli (Drawer) */}
      <Drawer
        isOpen={selectedAppointment !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAppointment(null);
        }}
        label={
          selectedAppointment
            ? `${selectedAppointment.customer_name} Randevu Detayı`
            : 'Randevu Detayı'
        }
        width={520}
      >
        <Layout
          header={
            <DrawerHeader
              title={
                selectedAppointment
                  ? selectedAppointment.customer_name
                  : 'Randevu Detayı'
              }
              subtitle={
                selectedAppointment
                  ? `${formatAppointmentTypeLabel(selectedAppointment.appointment_type)} · ${formatAppointmentStatusLabel(selectedAppointment.status)}`
                  : undefined
              }
              onOpenChange={(open) => {
                if (!open) setSelectedAppointment(null);
              }}
              hasDivider
            />
          }
          content={
            <LayoutContent>
              {selectedAppointment && (
                <VStack gap={4}>
                  <MetadataList>
                    <MetadataListItem label="Müşteri Adı">
                      <Text weight="semibold">
                        {selectedAppointment.customer_name}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Müşteri Tipi">
                      <Text>
                        {formatCustomerTypeLabel(
                          selectedAppointment.customer_type,
                        )}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Müşteri Telefonu">
                      <Text>
                        {formatTurkishPhone(selectedAppointment.customer_phone)}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Bağlı Gayrimenkul">
                      <VStack gap={0}>
                        <Text weight="medium">
                          {selectedAppointment.property_title ||
                            'Genel Danışmanlık (İlan Bağlı Değil)'}
                        </Text>
                        {selectedAppointment.property_location && (
                          <Text color="secondary" size="sm">
                            {selectedAppointment.property_location}
                          </Text>
                        )}
                      </VStack>
                    </MetadataListItem>
                    <MetadataListItem label="Randevu Tipi">
                      <Text>
                        {formatAppointmentTypeLabel(
                          selectedAppointment.appointment_type,
                        )}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Randevu Amacı">
                      <Text>
                        {formatAppointmentPurposeLabel(
                          selectedAppointment.purpose,
                        )}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Başlangıç Saati">
                      <Text weight="medium">
                        {formatDateTimeTR(selectedAppointment.start_time)}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Bitiş Saati">
                      <Text>
                        {formatDateTimeTR(selectedAppointment.end_time)}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Randevu Durumu">
                      <Token
                        label={formatAppointmentStatusLabel(
                          selectedAppointment.status,
                        )}
                        size="sm"
                      />
                    </MetadataListItem>
                    <MetadataListItem label="BR-07 (6 Saat İptal Kuralı)">
                      <Text>
                        {selectedAppointment.status !== 'AKTIF'
                          ? 'Randevu aktif olmadığı için iptal işlemi uygulanamaz.'
                          : selectedAppointment.can_cancel
                            ? `İptal edilebilir (Başlangıca ${selectedAppointment.hours_until_start.toFixed(1)} saat var — 6 saat sınırının üzerinde).`
                            : `İptal Kilitli (Başlangıca ${Math.max(0, selectedAppointment.hours_until_start).toFixed(1)} saat kaldı; 6 saatten az kaldığı için iptal edilemez).`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Görüşme Notu">
                      <Text>
                        {selectedAppointment.meeting_notes ||
                          'Henüz görüşme notu eklenmemiş.'}
                      </Text>
                    </MetadataListItem>
                  </MetadataList>
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Kapat"
                  variant="secondary"
                  onClick={() => setSelectedAppointment(null)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>
    </PageFrame>
  );
}
