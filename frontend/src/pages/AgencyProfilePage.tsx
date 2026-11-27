import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  createAgencyAdvisorAccount,
  fetchAgencyById,
  updateAgencyById,
} from '../api/agencies';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
import {
  addCustomAdvisor,
  getAdvisorsForAgency,
  toggleAdvisorOfficePermission,
  type AgencyAdvisor,
} from '../lib/advisors';
import type { AgencyRecord, UserSession } from '../types';
import {
  formatDigitsOnly,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';

export interface AgencyProfilePageProps {
  session: UserSession;
  onPreviewStorefront: (agencyId: number) => void;
  onNotify: (msg: string) => void;
}

/**
 * Madde 10: Kurumsal Ofis Bilgileri, Danışman Kadrosu ve Atanabilir Ofis Yönetim Yetkisi.
 * - Sadece "Şirket Yetkilisi" veya kendisine "Ofis Yönetim Yetkisi" atanmış danışmanlar
 *   ofis ayarlarını güncelleyebilir veya yeni danışman ekleyebilir.
 * - Şirket Yetkilisi diğer danışmanlara tek tıkla bu yetkiyi paylaşabilir veya geri alabilir.
 */
export function AgencyProfilePage({
  session,
  onPreviewStorefront,
  onNotify,
}: AgencyProfilePageProps) {
  const agencyId = session.agency?.id ?? 1;
  const [agency, setAgency] = useState<AgencyRecord | null>(null);
  const [advisors, setAdvisors] = useState<AgencyAdvisor[]>(() =>
    getAdvisorsForAgency(agencyId),
  );
  // Aktif görüntüleyen danışman simülasyonu (Yetki paylaşımını test edebilmek için)
  const [actingAdvisorId, setActingAdvisorId] = useState<number>(
    () => getAdvisorsForAgency(agencyId)[0]?.id ?? 101,
  );

  // Ofis alanları
  const [name, setName] = useState('');
  const [authPerson, setAuthPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [fax, setFax] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [city, setCity] = useState('Ankara');
  const [district, setDistrict] = useState('Çankaya');
  const [neighborhood, setNeighborhood] = useState('Kızılırmak Mah.');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Yeni Danışman Ekleme Modalı
  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  const [advName, setAdvName] = useState('');
  const [advTitle, setAdvTitle] = useState('Gayrimenkul Danışmanı');
  const [advPhone, setAdvPhone] = useState('');
  const [advEmail, setAdvEmail] = useState('');
  const [advPassword, setAdvPassword] = useState('');
  const [advSpecialty, setAdvSpecialty] = useState('Konut & Yatırım Uzmanı');
  const [advCanManage, setAdvCanManage] = useState(false);

  useEffect(() => {
    void fetchAgencyById(agencyId)
      .then((res) => {
        const a = res.agency;
        setAgency(a);
        setName(a.name);
        setAuthPerson(a.authorized_person);
        setPhone(a.phone);
        setMobilePhone(a.mobile_phone || '');
        setFax(a.fax || '');
        setTaxOffice(a.tax_office || '');
        setTaxNumber(a.tax_number || '');
        setCity(a.city || 'Ankara');
        setDistrict(a.district || 'Çankaya');
        setNeighborhood(a.neighborhood || '');
        setAddress(a.address || '');
        setLogoUrl(a.logo_url || '');
        setDescription(a.description || '');
      })
      .catch(() => {});
    const list = getAdvisorsForAgency(agencyId);
    setAdvisors(list);
    if (list[0]) setActingAdvisorId(list[0].id);
  }, [agencyId]);

  const actingAdvisor =
    advisors.find((a) => a.id === actingAdvisorId) ?? advisors[0];
  const hasOfficeManagePermission = Boolean(actingAdvisor?.can_manage_office);

  const handleTogglePermission = (target: AgencyAdvisor) => {
    if (!hasOfficeManagePermission) {
      onNotify('Yetki ataması yapmak için Ofis Yönetim Yetkiniz olmalıdır.');
      return;
    }
    if (target.is_founder) {
      onNotify('Şirket kurucu yetkilisinin yönetim yetkisi kaldırılamaz.');
      return;
    }
    const nextVal = !target.can_manage_office;
    toggleAdvisorOfficePermission(target.id, nextVal);
    setAdvisors(getAdvisorsForAgency(agencyId));
    onNotify(
      nextVal
        ? `${target.full_name} danışmanına Ofis Yönetim Yetkisi tanımlandı.`
        : `${target.full_name} danışmanının Ofis Yönetim Yetkisi geri alındı.`,
    );
  };

  const handleSaveAgency = async () => {
    if (!hasOfficeManagePermission) {
      onNotify('Bu işlem için Ofis Yönetim Yetkisine sahip olmalısınız.');
      return;
    }
    setSaving(true);
    try {
      const res = await updateAgencyById(agencyId, {
        name: name.trim(),
        authorized_person: authPerson.trim(),
        city,
        district,
        neighborhood,
        address: address.trim(),
        phone: phone.trim(),
        mobile_phone: mobilePhone.trim(),
        fax: fax.trim(),
        tax_office: taxOffice.trim(),
        tax_number: taxNumber.trim(),
        logo_url: logoUrl.trim(),
        description: description.trim(),
      });
      setAgency(res.agency);
      onNotify('Emlak ofisi ve yazıcı antet bilgileri güncellendi.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Ofis bilgileri kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdvisor = async () => {
    if (!hasOfficeManagePermission) return;
    if (!advName.trim() || !advPhone.trim() || !advEmail.trim() || !advPassword.trim()) {
      onNotify('Lütfen danışman adı, telefonu, e-posta ve şifre alanlarını doldurun.');
      return;
    }
    try {
      await createAgencyAdvisorAccount(agencyId, {
        full_name: advName.trim(),
        phone: advPhone.trim(),
        email: advEmail.trim(),
        password: advPassword,
      });
      addCustomAdvisor({
        agency_id: agencyId,
        full_name: advName.trim(),
        title: advTitle.trim() || 'Gayrimenkul Danışmanı',
        phone: advPhone.trim(),
        avatar_url:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
        experience_years: 5,
        specialty: advSpecialty.trim(),
        can_manage_office: advCanManage,
      });
      setAdvisors(getAdvisorsForAgency(agencyId));
      setAdvisorModalOpen(false);
      setAdvName('');
      setAdvPhone('');
      setAdvEmail('');
      setAdvPassword('');
      setAdvCanManage(false);
      onNotify('Yeni danışman eklendi ve giriş hesabı oluşturuldu.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Danışman hesabı oluşturulamadı.',
      );
    }
  };

  return (
    <PageContainer
      size="wide"
      title="Ofis, Danışmanlar ve Yetki Yönetimi"
      actions={
        <>
          <Select
            selectSize="sm"
            pill
            inline
            value={String(actingAdvisorId)}
            onChange={(v) => setActingAdvisorId(Number(v))}
            options={advisors.map((a) => ({
              value: String(a.id),
              label: `Aktif Rol: ${a.full_name} (${a.can_manage_office ? 'Yönetim Yetkili' : 'Standart Danışman'})`,
            }))}
          />
          <Button
            variant="outline"
            pill
            leftIcon={<ExternalLink size={15} />}
            onClick={() => onPreviewStorefront(agencyId)}
          >
            Mağaza Vitrinini Görüntüle
          </Button>
        </>
      }
    >
      {!hasOfficeManagePermission && (
        <Card
          padding="sm"
          style={{
            marginBottom: '16px',
            backgroundColor: 'var(--color-warning-bg)',
            borderColor: 'var(--color-warning-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--color-warning-text)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Lock size={16} />
            <span>
              Şu anda <strong>{actingAdvisor?.full_name}</strong> (Standart
              Danışman) rolüyle görüntülüyorsunuz. Ofis bilgilerini düzenlemek
              veya çalışan eklemek için Şirket Yetkilisi tarafından size{' '}
              <strong>"Ofis Yönetim Yetkisi"</strong> atanmalıdır.
            </span>
          </div>
        </Card>
      )}

      <DetailSplitLayout
        main={
          <>
            {/* 1. Ofis Çalışanları & Atanabilir Yönetim Yetkisi (Madde 10) */}
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Users size={18} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Danışmanlarımız ve Yetki Paylaşımı ({advisors.length})
                  </h3>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  pill
                  disabled={!hasOfficeManagePermission}
                  leftIcon={<Plus size={14} />}
                  onClick={() => setAdvisorModalOpen(true)}
                >
                  Yeni Danışman Ekle
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {advisors.map((adv) => (
                  <div key={adv.id} className="advisor-manage-card">
                    <div className="advisor-manage-identity">
                      <Avatar
                        src={adv.avatar_url}
                        name={adv.full_name}
                        size="lg"
                        shape="rounded"
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '14.5px' }}>
                            {adv.full_name}
                          </span>
                          <Badge
                            variant={
                              adv.is_founder
                                ? 'primary'
                                : adv.can_manage_office
                                  ? 'verified'
                                  : 'neutral'
                            }
                          >
                            {adv.is_founder
                              ? 'Şirket Kurucu Yetkilisi'
                              : adv.can_manage_office
                                ? 'Ofis Yönetim Yetkili'
                                : 'Gayrimenkul Danışmanı'}
                          </Badge>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            marginTop: '4px',
                            lineHeight: 1.45,
                          }}
                        >
                          {adv.title} • {adv.phone}
                        </div>
                        {adv.specialty && (
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            Uzmanlık: {adv.specialty}
                          </div>
                        )}
                      </div>
                    </div>

                    {!adv.is_founder && (
                      <Button
                        variant={
                          adv.can_manage_office ? 'outline-primary' : 'outline'
                        }
                        size="xs"
                        pill
                        disabled={!hasOfficeManagePermission}
                        leftIcon={<KeyRound size={13} />}
                        onClick={() => handleTogglePermission(adv)}
                      >
                        {adv.can_manage_office
                          ? 'Yönetim Yetkisini Kaldır'
                          : 'Ofis Yönetim Yetkisi Ver'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* 2. Kurumsal İşletme Bilgileri */}
            <Card padding="lg">
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: '17px',
                  fontWeight: 700,
                }}
              >
                İşletme ve İletişim Bilgileri
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                  gap: '14px',
                }}
              >
                <Input
                  label="İşletme Resmi Ünvanı"
                  value={name}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Sorumlu Yetkili Kişi"
                  value={authPerson}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) =>
                    setAuthPerson(sanitizeNameInput(e.target.value))
                  }
                />
                <Input
                  label="Ofis Sabit Telefonu"
                  value={phone}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
                />
                <Input
                  label="Kurumsal Cep Telefonu"
                  value={mobilePhone}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) =>
                    setMobilePhone(formatTurkishPhone(e.target.value))
                  }
                />
                <Input
                  label="Vergi Dairesi (Kayıtlı)"
                  value={taxOffice}
                  disabled
                  onChange={(e) => setTaxOffice(e.target.value)}
                />
                <Input
                  label="Vergi Kimlik Numarası (Kayıtlı)"
                  value={taxNumber}
                  disabled
                  onChange={(e) =>
                    setTaxNumber(formatDigitsOnly(e.target.value, 11))
                  }
                />
                <Input
                  label="İl / İlçe / Mahalle"
                  value={`${city} / ${district} / ${neighborhood}`}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
                <Input
                  label="Kurumsal Logo URL"
                  value={logoUrl}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <Input
                  label="Açık Adres"
                  value={address}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <Input
                  label="Kurumsal Tanıtım Metni"
                  multiline
                  rows={2}
                  value={description}
                  disabled={!hasOfficeManagePermission}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div
                style={{
                  marginTop: '18px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  variant="primary"
                  pill
                  leftIcon={<Save size={15} />}
                  disabled={saving || !hasOfficeManagePermission}
                  onClick={() => void handleSaveAgency()}
                >
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </Card>
          </>
        }
        sidebar={
          <>
            {/* Sağ A4 Yazıcı Çıktısı Antet Önizlemesi */}
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  <Printer size={15} color="var(--color-primary)" />
                  <span>A4 Yazıcı Antet Önizlemesi</span>
                </span>
                <Badge variant="verified" icon={<ShieldCheck size={12} />}>
                  Resmi Antet
                </Badge>
              </div>

              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #0f172a',
                  }}
                >
                  <Avatar
                    src={logoUrl}
                    name={name || 'Ofis'}
                    size="lg"
                    shape="rounded"
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Yetkili: {authPerson}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#e11d48',
                        marginTop: '2px',
                      }}
                    >
                      TTBS Yetki Belge No:{' '}
                      {agency?.ttbs_document_no ?? '0600482'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    <strong>Adres:</strong> {neighborhood} {address} ({district}{' '}
                    / {city})
                  </div>
                  <div>
                    <strong>Tel:</strong> {phone} • <strong>Cep:</strong>{' '}
                    {mobilePhone}
                  </div>
                  <div>
                    <strong>Vergi Dairesi:</strong> {taxOffice} •{' '}
                    <strong>VKN:</strong> {taxNumber}
                  </div>
                </div>
              </div>
            </Card>
          </>
        }
      />

      <Modal
        isOpen={advisorModalOpen}
        onClose={() => setAdvisorModalOpen(false)}
        title="Ofis Kadrosuna Yeni Danışman Ekle"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setAdvisorModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              pill
              leftIcon={<CheckCircle2 size={14} />}
              onClick={() => void handleAddAdvisor()}
            >
              Danışmanı Ekle
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Danışman Adı Soyadı"
            value={advName}
            onChange={(e) => setAdvName(sanitizeNameInput(e.target.value))}
            placeholder="Örn: Ali Sarı"
          />
          <Input
            label="Unvanı"
            value={advTitle}
            onChange={(e) => setAdvTitle(e.target.value)}
            placeholder="Örn: Kıdemli Gayrimenkul Danışmanı"
          />
          <Input
            label="Cep Telefonu"
            value={advPhone}
            onChange={(e) => setAdvPhone(formatTurkishPhone(e.target.value))}
            placeholder="0 (532) 123 45 67"
          />
          <Input
            label="Giriş E-Posta Adresi"
            type="email"
            value={advEmail}
            onChange={(e) => setAdvEmail(e.target.value)}
            placeholder="ornek@ofisiniz.com.tr"
          />
          <Input
            label="Sisteme Giriş Şifresi"
            type="password"
            value={advPassword}
            onChange={(e) => setAdvPassword(e.target.value)}
            placeholder="En az 6 karakter"
          />
          <Input
            label="Uzmanlık Bölgesi"
            value={advSpecialty}
            onChange={(e) => setAdvSpecialty(e.target.value)}
          />
          <Select
            label="Ofis Yönetim Yetkisi"
            value={advCanManage ? 'true' : 'false'}
            onChange={(v) => setAdvCanManage(v === 'true')}
            options={[
              {
                value: 'false',
                label: 'Standart Danışman (Sadece İlan & Randevu)',
              },
              {
                value: 'true',
                label: 'Yönetim Yetkili (Ofis & Çalışan Yönetebilir)',
              },
            ]}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}

export default AgencyProfilePage;
