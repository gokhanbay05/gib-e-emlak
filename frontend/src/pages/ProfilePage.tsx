import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  FileText,
  Heart,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { fetchAgencySellRequests } from '../api/agencies';
import {
  cancelAppointment,
  fetchCalendarOverview,
} from '../api/appointments';
import { updateProfile } from '../api/auth';
import { fetchFavorites, removeFavorite } from '../api/favorites';
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
    isAgent ? 'security' : initialTab,
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

  // GeoSocial tarzı Şifre Doğrulama Modalı
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(isAgent ? 'security' : initialTab);
  }, [initialTab, isAgent]);

  useEffect(() => {
    if (isAgent || !session.id) return;
    void fetchFavorites(session.id)
      .then((res) => setFavorites(res.favorites))
      .catch(() => {});

    void fetchCalendarOverview({ agency_id: 1 })
      .then((res) => {
        const mine = res.appointments.filter(
          (a) =>
            a.customer_name
              .toLocaleLowerCase('tr-TR')
              .includes(session.full_name.toLocaleLowerCase('tr-TR')) ||
            a.customer_id === session.customer?.id,
        );
        setAppointments(mine.length > 0 ? mine : res.appointments.slice(0, 3));
      })
      .catch(() => {});

    void fetchAgencySellRequests(1)
      .then((res) => setSellRequests(res.sell_requests))
      .catch(() => {});
  }, [session, isAgent]);

  const handleRemoveFavorite = async (propertyId: number) => {
    await removeFavorite(session.id, propertyId);
    setFavorites((prev) => prev.filter((f) => f.property_id !== propertyId));
    onNotify('İlan favorilerinizden çıkarıldı.');
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    try {
      const res = await cancelAppointment(appointmentId);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? res.appointment : a)),
      );
      onNotify(res.message);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Randevu iptal edilemedi.',
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

  const tabItems = isAgent
    ? [
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Avatar name={session.full_name} size="lg" />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {session.full_name}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '2px',
                }}
              >
                <span>{session.email}</span>
                <span>•</span>
                <span>{session.phone}</span>
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
          {appointments.length === 0 ? (
            <Card padding="lg">
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Kayıtlı randevunuz bulunmuyor.
              </div>
            </Card>
          ) : (
            appointments.map((appt) => (
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
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
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
                      >
                        {formatAppointmentStatusLabel(appt.status)}
                      </Badge>
                      <span style={{ fontWeight: 700, fontSize: '14.5px' }}>
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

                  {appt.status === 'AKTIF' && (
                    <Button
                      variant="danger"
                      size="sm"
                      pill
                      leftIcon={<Trash2 size={14} />}
                      onClick={() => void handleCancelAppointment(appt.id)}
                    >
                      Randevuyu İptal Et
                    </Button>
                  )}
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

      {/* Sekme 4: Hesap Bilgilerim & Güvenlik (Şifre Doğrulamalı) */}
      {activeTab === 'security' && (
        <Card padding="lg">
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
              <Building2 size={20} color="var(--color-primary)" />
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
            şifrenizi giriniz. (Demo şifresi:{' '}
            <strong>{isAgent ? 'Kurumsal123!' : 'Musteri123!'}</strong>)
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
    </PageContainer>
  );
}

export default ProfilePage;
