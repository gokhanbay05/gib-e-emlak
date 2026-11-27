import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { fetchAgencyById, updateAgencyById } from '../api/agencies';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
import {
  addCustomAdvisor,
  getAdvisorsForAgency,
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
 * Kurumsal Ofis Bilgileri, Danışman Kadrosu ("Danışmanlarımız") ve A4 Yazıcı Antet Önizlemesi.
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
  const [advSpecialty, setAdvSpecialty] = useState('Konut & Yatırım Uzmanı');

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
    setAdvisors(getAdvisorsForAgency(agencyId));
  }, [agencyId]);

  const handleSaveAgency = async () => {
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

  const handleAddAdvisor = () => {
    if (!advName.trim() || !advPhone.trim()) return;
    addCustomAdvisor({
      agency_id: agencyId,
      full_name: advName.trim(),
      title: advTitle.trim() || 'Gayrimenkul Danışmanı',
      phone: advPhone.trim(),
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
      experience_years: 5,
      specialty: advSpecialty.trim(),
    });
    setAdvisors(getAdvisorsForAgency(agencyId));
    setAdvisorModalOpen(false);
    setAdvName('');
    setAdvPhone('');
    onNotify('Yeni gayrimenkul danışmanı ofis kadrosuna eklendi.');
  };

  return (
    <PageContainer
      size="wide"
      title="Ofis, Danışmanlar ve Antet Yönetimi"
      actions={
        <>
          <Button
            variant="outline"
            pill
            leftIcon={<ExternalLink size={15} />}
            onClick={() => onPreviewStorefront(agencyId)}
          >
            Mağaza Vitrinini Görüntüle
          </Button>
          <Button
            variant="primary"
            pill
            leftIcon={<Save size={15} />}
            disabled={saving}
            onClick={() => void handleSaveAgency()}
          >
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </>
      }
    >
      <DetailSplitLayout
        main={
          <>
            {/* 1. Kurumsal İşletme Bilgileri */}
            <Card padding="lg">
              <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 700 }}>
                İşletme ve İletişim Bilgileri
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                }}
              >
                <Input
                  label="İşletme Resmi Ünvanı"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Sorumlu Yetkili Kişi"
                  value={authPerson}
                  onChange={(e) =>
                    setAuthPerson(sanitizeNameInput(e.target.value))
                  }
                />
                <Input
                  label="Ofis Sabit Telefonu"
                  value={phone}
                  onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
                />
                <Input
                  label="Kurumsal Cep Telefonu"
                  value={mobilePhone}
                  onChange={(e) =>
                    setMobilePhone(formatTurkishPhone(e.target.value))
                  }
                />
                <Input
                  label="Vergi Dairesi"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                />
                <Input
                  label="Vergi Kimlik Numarası"
                  value={taxNumber}
                  onChange={(e) =>
                    setTaxNumber(formatDigitsOnly(e.target.value, 11))
                  }
                />
                <Input
                  label="İl / İlçe / Mahalle"
                  value={`${city} / ${district} / ${neighborhood}`}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
                <Input
                  label="Kurumsal Logo URL"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <Input
                  label="Açık Adres"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <Input
                  label="Kurumsal Tanıtım Metni"
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </Card>

            {/* 2. Ofis Çalışanları / Danışmanlarımız Yönetimi (Screenshot #12) */}
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Danışmanlarımız ({advisors.length})
                  </h3>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  pill
                  leftIcon={<Plus size={14} />}
                  onClick={() => setAdvisorModalOpen(true)}
                >
                  Danışman Ekle
                </Button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                {advisors.map((adv) => (
                  <div
                    key={adv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-bg-surface-alt)',
                      border: '1px solid var(--color-border-default)',
                    }}
                  >
                    <Avatar
                      src={adv.avatar_url}
                      name={adv.full_name}
                      size="md"
                      shape="rounded"
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        {adv.full_name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {adv.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          marginTop: '2px',
                        }}
                      >
                        {adv.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        }
        sidebar={
          <>
            {/* Sağ Sabit A4 Yazıcı Çıktısı Antet Önizlemesi */}
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

                <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
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

                <div
                  style={{
                    marginTop: '6px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    fontSize: '11.5px',
                    color: '#64748b',
                    textAlign: 'center',
                  }}
                >
                  [Gayrimenkul Teknik Özellikleri ve Müşteri Bilgi Fişi Alanı]
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
              onClick={handleAddAdvisor}
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
            label="Uzmanlık Bölgesi"
            value={advSpecialty}
            onChange={(e) => setAdvSpecialty(e.target.value)}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}

export default AgencyProfilePage;
