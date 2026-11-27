import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Camera,
  FileText,
  Heart,
  Lock,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { fetchAgencySellRequests } from '../api/agencies';
import {
  cancelAppointment,
  fetchCalendarOverview,
} from '../api/appointments';
import { updateProfile } from '../api/auth';
import { ensureChatThread, uploadAvatarFile } from '../api/engagement';
import { fetchFavorites, removeFavorite } from '../api/favorites';
import ChatPanel from '../components/chat/ChatPanel';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Tabs,
} from '../components/core';
import { PageContainer } from '../components/layout';
import PropertyHorizontalCard from '../components/property/PropertyHorizontalCard';
import type { ProfileTabKey } from '../lib/router';
import { formatPriceTL } from '../lib/utils';
import type {
  AgencySellRequestSummary,
  CalendarAppointmentRecord,
  FavoriteItemRecord,
  PropertyRecord,
  UserSession,
} from '../types';
import {
  formatAppointmentPurposeLabel,
  formatAppointmentStatusLabel,
  formatDateTimeTR,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';

export interface ProfilePageProps {
  session: UserSession;
  initialTab?: ProfileTabKey;
  onTabChange?: (tab: ProfileTabKey) => void;
  onSessionUpdate: (user: UserSession) => void;
  onSelectProperty: (property: PropertyRecord) => void;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

/**
 * Yan çekmecesiz (LayoutPanel/Drawer olmadan), yatay sekmeli "Profilim" sayfası.
 * Emlakçı (AGENT) rolündeyken müşteri sekmeleri (Favorilerim, Randevularım, Satış Başvurularım) gizlenir.
 */
export function ProfilePage({
  session,
  initialTab = 'favorites',
  onTabChange,
  onSessionUpdate,
  onSelectProperty,
  onLogout,
  onNotify,
}: ProfilePageProps) {
  const isAgent = session.role === 'AGENT';
  const [activeTab, setActiveTab] = useState<ProfileTabKey>(
    isAgent ? (initialTab === 'messages' ? 'messages' : 'security') : initialTab,
  );

  const [favorites, setFavorites] = useState<FavoriteItemRecord[]>([]);
  const [appointments, setAppointments] = useState<CalendarAppointmentRecord[]>(
    [],
  );
  const [sellRequests, setSellRequests] = useState<AgencySellRequestSummary[]>(
    [],
  );

  // Hesap güncelleme alanları
  const nameParts = session.full_name.split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(session.email);
  const [phone, setPhone] = useState(session.phone);
  const [newPassword, setNewPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(session.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // GeoSocial tarzı Şifre Doğrulama Modalı & İptal Nedeni Modalı
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedChatThreadId, setSelectedChatThreadId] = useState<number | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] =
    useState<CalendarAppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<
    'ALL' | 'AKTIF' | 'TAMAMLANDI' | 'IPTAL_EDILDI'
  >('ALL');

  useEffect(() => {
    setActiveTab(
      isAgent ? (initialTab === 'messages' ? 'messages' : 'security') : initialTab,
    );
  }, [initialTab, isAgent]);

  useEffect(() => {
    setAvatarUrl(session.avatar_url || '');
  }, [session.avatar_url]);

  useEffect(() => {
    if (isAgent || !session.id) return;
    const loadCustomerData = () => {
      void fetchFavorites(session.id)
        .then((res) => setFavorites(res.favorites))
        .catch(() => {});

      if (session.customer?.id) {
        void fetchCalendarOverview({
          agency_id: 0,
          customer_id: session.customer.id,
        })
          .then((res) => {
            setAppointments(res.appointments);
          })
          .catch(() => {});

        void fetchAgencySellRequests(0, session.customer.id)
          .then((res) => setSellRequests(res.sell_requests))
          .catch(() => {});
      }
    };

    loadCustomerData();
    window.addEventListener('focus', loadCustomerData);
    return () => window.removeEventListener('focus', loadCustomerData);
  }, [session, isAgent]);

  const handleRemoveFavorite = async (propertyId: number) => {
    await removeFavorite(session.id, propertyId);
    setFavorites((prev) => prev.filter((f) => f.property_id !== propertyId));
    onNotify('İlan favorilerinizden çıkarıldı.');
  };

  const handleConfirmCancelAppointment = async () => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      const res = await cancelAppointment(cancelTarget.id, cancelReason.trim());
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? res.appointment : a)),
      );
      setCancelTarget(null);
      setCancelReason('');
      onNotify(res.message);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Randevu iptal edilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAppointmentChat = async (appt: CalendarAppointmentRecord) => {
    if (!session.customer?.id) return;
    try {
      const res = await ensureChatThread({
        agency_id: appt.agency_id,
        customer_id: session.customer.id,
        property_id: appt.property_id,
        advisor_name: appt.advisor_name,
      });
      setSelectedChatThreadId(res.thread.id);
      setActiveTab('messages');
      onTabChange?.('messages');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Sohbet odası açılamadı.',
      );
    }
  };

  const handleConfirmUpdateProfile = async () => {
    if (!currentPassword.trim()) {
      setErrorMsg('Değişiklikleri kaydetmek için mevcut şifrenizi giriniz.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await updateProfile(session.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl || undefined,
        current_password: currentPassword,
        new_password: newPassword.trim() || undefined,
      });
      onSessionUpdate(res.user);
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      onNotify('Profil ve hesap bilgileriniz başarıyla güncellendi.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Bilgiler güncellenemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatarFile(file);
      setAvatarUrl(res.url);
      onSessionUpdate({ ...session, avatar_url: res.url });
      onNotify('Profil fotoğrafı yüklendi! Kalıcı kayıt için "Bilgilerimi Güncelle" ile onaylayabilirsiniz.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.',
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const tabItems = isAgent
    ? [
        {
          value: 'messages',
          label: 'Müşteri Mesajları',
          icon: <MessageSquare size={15} />,
        },
        {
          value: 'security',
          label: 'Hesap Bilgilerim & Güvenlik',
          icon: <ShieldCheck size={15} />,
        },
      ]
    : [
        {
          value: 'favorites',
          label: 'Favori İlanlarım',
          icon: <Heart size={15} />,
          count: favorites.length,
        },
        {
          value: 'appointments',
          label: 'Randevularım',
          icon: <Calendar size={15} />,
          count: appointments.length,
        },
        {
          value: 'sell-requests',
          label: 'Satış & Kiralama Başvurularım',
          icon: <FileText size={15} />,
          count: sellRequests.length,
        },
        {
          value: 'messages',
          label: 'Mesajlarım',
          icon: <MessageSquare size={15} />,
        },
        {
          value: 'security',
          label: 'Hesap Bilgilerim & Güvenlik',
          icon: <ShieldCheck size={15} />,
        },
      ];

  return (
    <PageContainer
      size="default"
      title="Profilim"
      actions={
        <Button
          variant="danger"
          size="sm"
          pill
          leftIcon={<LogOut size={14} />}
          onClick={onLogout}
        >
          Oturumu Kapat
        </Button>
      }
    >
      {/* Üst Kullanıcı Kimlik Özeti Kartı */}
      <Card style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <Avatar src={avatarUrl || session.avatar_url} name={session.full_name} size="lg" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {session.full_name}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px 10px',
                  marginTop: '2px',
                  wordBreak: 'break-word',
                }}
              >
                <span>{session.email}</span>
                <span>•</span>
                <span style={{ whiteSpace: 'nowrap' }}>{session.phone}</span>
              </div>
            </div>
          </div>

          <Badge variant={isAgent ? 'verified' : 'primary'}>
            {isAgent
              ? `Kurumsal Emlak Danışmanı (${session.agency?.name ?? ''})`
              : 'Bireysel Müşteri Hesabı'}
          </Badge>
        </div>
      </Card>

      {/* Yatay Sekmeler (Yan Panel Yok!) */}
      <div style={{ marginBottom: '18px' }}>
        <Tabs
          variant="pills"
          items={tabItems}
          value={activeTab}
          onChange={(val) => {
            const next = val as ProfileTabKey;
            setActiveTab(next);
            onTabChange?.(next);
          }}
        />
      </div>

      {/* Sekme 1: Favori İlanlarım */}
      {!isAgent && activeTab === 'favorites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {favorites.length === 0 ? (
            <Card padding="lg">
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  padding: '20px 0',
                }}
              >
                Henüz favorilerinize eklediğiniz bir gayrimenkul ilanı bulunmuyor.
              </div>
            </Card>
          ) : (
            favorites.map((fav) =>
              fav.property ? (
                <PropertyHorizontalCard
                  key={fav.id}
                  property={fav.property}
                  isFavorited
                  onSelect={onSelectProperty}
                  onToggleFavorite={(id) => void handleRemoveFavorite(id)}
                />
              ) : null,
            )
          )}
        </div>
      )}

      {/* Sekme 2: Randevularım */}
      {!isAgent && activeTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {appointments.length > 0 && (
            <Tabs
              variant="pills"
              value={appointmentStatusFilter}
              onChange={(v) =>
                setAppointmentStatusFilter(
                  v as 'ALL' | 'AKTIF' | 'TAMAMLANDI' | 'IPTAL_EDILDI',
                )
              }
              items={[
                { value: 'ALL', label: 'Tümü', count: appointments.length },
                {
                  value: 'AKTIF',
                  label: 'Aktif',
                  count: appointments.filter((a) => a.status === 'AKTIF').length,
                },
                {
                  value: 'TAMAMLANDI',
                  label: 'Tamamlandı',
                  count: appointments.filter((a) => a.status === 'TAMAMLANDI').length,
                },
                {
                  value: 'IPTAL_EDILDI',
                  label: 'İptal',
                  count: appointments.filter((a) => a.status === 'IPTAL_EDILDI').length,
                },
              ]}
            />
          )}

          {appointments.length === 0 ? (
            <Card padding="lg">
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Kayıtlı randevunuz bulunmuyor.
              </div>
            </Card>
          ) : (
            appointments
              .filter(
                (a) =>
                  appointmentStatusFilter === 'ALL' ||
                  a.status === appointmentStatusFilter,
              )
              .map((appt) => (
              <Card key={appt.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '6px',
                        marginBottom: '6px',
                      }}
                    >
                      <Badge
                        variant={
                          appt.status === 'AKTIF'
                            ? 'success'
                            : appt.status === 'IPTAL_EDILDI'
                              ? 'danger'
                              : 'neutral'
                        }
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {formatAppointmentStatusLabel(appt.status)}
                      </Badge>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', lineHeight: 1.35 }}>
                        {appt.property_title ||
                          formatAppointmentPurposeLabel(appt.purpose)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Tarih & Saat: <strong>{formatDateTimeTR(appt.start_time)}</strong>{' '}
                      • Ofis: {appt.agency_name}
                    </div>
                    {appt.meeting_notes && (
                      <div
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--color-text-body)',
                          marginTop: '4px',
                        }}
                      >
                        Not: {appt.meeting_notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {appt.status !== 'IPTAL_EDILDI' && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        pill
                        leftIcon={<MessageSquare size={14} />}
                        onClick={() => void handleOpenAppointmentChat(appt)}
                      >
                        Sohbeti Aç
                      </Button>
                    )}

                    {appt.status === 'AKTIF' && (
                      <Button
                        variant="danger"
                        size="sm"
                        pill
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => {
                          setCancelTarget(appt);
                          setCancelReason('');
                        }}
                      >
                        Randevuyu İptal Et
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sekme 3: Satış & Kiralama Başvurularım */}
      {!isAgent && activeTab === 'sell-requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sellRequests.length === 0 ? (
            <Card padding="lg">
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Henüz gönderilmiş bir ev satış veya kiralama başvurunuz bulunmuyor.
              </div>
            </Card>
          ) : (
            sellRequests.map((req) => (
              <Card key={req.reference_no}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Badge variant="primary">{req.reference_no}</Badge>
                      <span style={{ fontWeight: 700, fontSize: '14.5px' }}>
                        {formatListingTypeLabel(req.listing_type)}{' '}
                        {formatPropertyTypeLabel(req.property_type)} •{' '}
                        {req.room_count} ({req.gross_sqm} m²)
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-muted)',
                        marginTop: '4px',
                      }}
                    >
                      {req.district} / {req.city} ({req.neighborhood}) • Yetkili
                      Ofis: <strong>{req.agency_name}</strong>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {formatPriceTL(req.expected_price)}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sekme: Uygulama İçi Mesajlar */}
      {activeTab === 'messages' && (
        <ChatPanel
          session={session}
          initialThreadId={selectedChatThreadId}
          onNotify={onNotify}
        />
      )}

      {/* Sekme 4: Hesap Bilgilerim & Güvenlik (Şifre Doğrulamalı) */}
      {activeTab === 'security' && (
        <Card padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              paddingBottom: '18px',
              marginBottom: '18px',
              borderBottom: '1px solid var(--color-border-default)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Avatar src={avatarUrl || session.avatar_url} name={session.full_name} size="xl" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  Profil Fotoğrafı
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  Mesajlaşma ve değerlendirmelerde görünecek profil görseliniz (PNG / JPG / WebP)
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => void handleAvatarSelected(e)}
              />
              <Button
                variant="outline"
                size="sm"
                pill
                disabled={uploadingAvatar}
                leftIcon={<Camera size={15} />}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? 'Yükleniyor...' : 'Fotoğraf Seç & Yükle'}
              </Button>
            </div>
          </div>

          <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 700 }}>
            Kişisel Bilgiler ve Güvenlik Ayarları
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            <Input
              label="Ad"
              value={firstName}
              onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
            />
            <Input
              label="Soyad"
              value={lastName}
              onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
            />
            <Input
              label="E-Posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Cep Telefonu"
              value={phone}
              onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
            />
            <Input
              label="Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yeni şifreniz"
            />
          </div>

          {isAgent && session.agency && (
            <div
              style={{
                marginTop: '20px',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Building2 size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                  Bağlı Kurumsal İşletme: {session.agency.name}
                </div>
                <div
                  style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
                >
                  Taşınmaz Ticareti Yetki Belge No:{' '}
                  <strong>{session.agency.ttbs_document_no}</strong> •{' '}
                  {session.agency.address}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              variant="primary"
              pill
              leftIcon={<Lock size={15} />}
              onClick={() => {
                setErrorMsg(null);
                setPasswordModalOpen(true);
              }}
            >
              Bilgilerimi Güncelle
            </Button>
          </div>
        </Card>
      )}

      {/* GeoSocial Tarzı Şifre Doğrulama Modalı */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Güvenlik Doğrulaması"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setPasswordModalOpen(false)}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              pill
              disabled={saving}
              onClick={() => void handleConfirmUpdateProfile()}
            >
              {saving ? 'Doğrulanıyor...' : 'Onayla ve Kaydet'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--color-text-body)',
            }}
          >
            Hesap bilgilerinizdeki değişiklikleri kaydetmek için lütfen mevcut
            şifrenizi giriniz.
          </p>
          <Input
            label="Mevcut Şifreniz"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            icon={<Lock size={15} />}
            placeholder="Mevcut şifrenizi girin"
          />
          {errorMsg && (
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
              {errorMsg}
            </div>
          )}
        </div>
      </Modal>

      {/* Randevu İptal Onay & Danışmana İptal Nedeni Bildirim Modalı */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Randevuyu İptal Et"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button
              variant="outline"
              size="sm"
              pill
              disabled={saving}
              onClick={() => setCancelTarget(null)}
            >
              Vazgeç
            </Button>
            <Button
              variant="danger"
              size="sm"
              pill
              disabled={saving}
              onClick={() => void handleConfirmCancelAppointment()}
            >
              {saving ? 'İptal Ediliyor...' : 'İptali Onayla'}
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13.5px', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              <strong>{cancelTarget.property_title || 'Gayrimenkul Gösterimi'}</strong>{' '}
              randevunuzu ({formatDateTimeTR(cancelTarget.start_time)}) iptal etmek üzeresiniz.
              Danışmanınıza otomatik bildirim gönderilecektir.
            </div>
            <Input
              label="İptal Nedeni (Opsiyonel)"
              multiline
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Örn: Programım değişti, farklı bir gün tekrar planlayacağım..."
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

export default ProfilePage;
