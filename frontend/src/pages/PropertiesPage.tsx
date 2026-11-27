import React, { useEffect, useMemo, useState } from 'react';
import {
  Edit3,
  ExternalLink,
  MapPin,
  Plus,
  Printer,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { fetchCustomers } from '../api/customers';
import {
  fetchDistricts,
  fetchNeighborhoods,
  fetchProvinces,
} from '../api/locations';
import {
  buildPropertyPrintSheetUrl,
  createProperty,
  fetchProperties,
  updatePropertyById,
  updatePropertyStatus,
} from '../api/properties';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Tabs,
} from '../components/core';
import { PageContainer } from '../components/layout';
import { formatPriceTL, getPropertyGallery } from '../lib/utils';
import type {
  CustomerRecord,
  HeatingType,
  ListingType,
  LocationOption,
  PropertyCounts,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
  UserSession,
} from '../types';
import {
  formatDigitsOnly,
  formatHeatingTypeLabel,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
  normalizeTurkish,
} from '../utils/formatters';
import { propertySchema, zodErrorsToMap } from '../utils/validation';

export interface PropertiesPageProps {
  session: UserSession;
  globalSearchQuery: string;
  onSelectProperty: (property: PropertyRecord) => void;
  onNotify: (msg: string) => void;
}

/**
 * Kurumsal Portföy Yönetimi sayfası.
 * Yan çekmece (Drawer) veya başlık altı açıklama metni içermez;
 * yeni ilan ekleme ve düzenleme ortalanmış Modal ile çalışır.
 */
export function PropertiesPage({
  session,
  globalSearchQuery,
  onSelectProperty,
  onNotify,
}: PropertiesPageProps) {
  const agencyId = session.agency?.id ?? 1;
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [counts, setCounts] = useState<PropertyCounts>({
    ALL: 0,
    AKTIF: 0,
    SATILDI: 0,
    KIRALANDI: 0,
    PASIF: 0,
  });
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('ALL');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState('');

  // Ekleme / Düzenleme Modalı
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ownerId, setOwnerId] = useState<number>(0);
  const [ownerTc, setOwnerTc] = useState('');
  const [title, setTitle] = useState('');
  const [listingType, setListingType] = useState<ListingType>('SATILIK');
  const [propertyType, setPropertyType] = useState<PropertyType>('DAIRE');
  const [price, setPrice] = useState('5400000');
  const [grossSqm, setGrossSqm] = useState('135');
  const [netSqm, setNetSqm] = useState('120');
  const [roomCount, setRoomCount] = useState('3+1');
  const [floorNumber, setFloorNumber] = useState('3');
  const [buildingFloors, setBuildingFloors] = useState('6');
  const [heatingType, setHeatingType] =
    useState<HeatingType>('DOGALGAZ_KOMBI');
  const [city, setCity] = useState('Ankara');
  const [district, setDistrict] = useState('Çankaya');
  const [neighborhood, setNeighborhood] = useState('Kızılırmak Mah.');
  const [addressDetail, setAddressDetail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('AKTIF');
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  const loadPortfolio = async () => {
    try {
      const res = await fetchProperties({
        agency_id: agencyId,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        listing_type:
          listingTypeFilter !== 'ALL' ? listingTypeFilter : undefined,
        property_type:
          propertyTypeFilter !== 'ALL' ? propertyTypeFilter : undefined,
      });
      setProperties(res.properties);
      setCounts(res.counts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadPortfolio();
  }, [agencyId, statusFilter, listingTypeFilter, propertyTypeFilter]);

  useEffect(() => {
    void fetchCustomers({ agency_id: agencyId })
      .then((res) => setCustomers(res.customers))
      .catch(() => {});
    void fetchProvinces()
      .then((res) => setProvinces(res.provinces))
      .catch(() => {});
  }, [agencyId]);

  useEffect(() => {
    const found = provinces.find((p) => p.name === city);
    if (!found) return;
    void fetchDistricts(found.id)
      .then((res) => setDistricts(res.districts))
      .catch(() => {});
  }, [city, provinces]);

  useEffect(() => {
    const found = districts.find((d) => d.name === district);
    if (!found) return;
    void fetchNeighborhoods(found.id)
      .then((res) => setNeighborhoods(res.neighborhoods))
      .catch(() => {});
  }, [district, districts]);

  const filteredList = useMemo(() => {
    const combinedQuery = normalizeTurkish(
      `${globalSearchQuery} ${localSearch}`.trim(),
    );
    if (!combinedQuery) return properties;
    return properties.filter((p) => {
      const hay = normalizeTurkish(
        `${p.id} ${p.title} ${p.city} ${p.district} ${p.neighborhood} ${p.owner?.full_name ?? ''}`,
      );
      return hay.includes(combinedQuery);
    });
  }, [properties, globalSearchQuery, localSearch]);

  const openCreateModal = () => {
    const defaultOwner = customers[0];
    setEditingId(null);
    setOwnerId(defaultOwner?.id ?? 1);
    setOwnerTc(defaultOwner?.tc_identity_no || '14582930412');
    setTitle('');
    setListingType('SATILIK');
    setPropertyType('DAIRE');
    setPrice('5250000');
    setGrossSqm('130');
    setNetSqm('115');
    setRoomCount('3+1');
    setFloorNumber('3');
    setBuildingFloors('6');
    setHeatingType('DOGALGAZ_KOMBI');
    setCity('Ankara');
    setDistrict('Çankaya');
    setNeighborhood('Kızılırmak Mah.');
    setAddressDetail('Dumlupınar Blv. No:14');
    setDescription(
      'Merkezi konumda, metroya ve alışveriş merkezlerine yürüme mesafesinde, krediye uygun ferah gayrimenkul.',
    );
    setStatus('AKTIF');
    setImageUrl('');
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (p: PropertyRecord) => {
    setEditingId(p.id);
    setOwnerId(p.owner_customer_id);
    setOwnerTc(p.owner?.tc_identity_no || '14582930412');
    setTitle(p.title);
    setListingType(p.listing_type);
    setPropertyType(p.property_type);
    setPrice(String(p.price));
    setGrossSqm(String(p.gross_sqm));
    setNetSqm(String(p.net_sqm));
    setRoomCount(p.room_count);
    setFloorNumber(String(p.floor_number));
    setBuildingFloors(String(p.building_floors));
    setHeatingType(p.heating_type);
    setCity(p.city);
    setDistrict(p.district);
    setNeighborhood(p.neighborhood);
    setAddressDetail(p.address_detail);
    setDescription(p.agent_description);
    setStatus(p.status);
    setImageUrl(p.image_url || '');
    setErrors({});
    setModalOpen(true);
  };

  const handleSaveProperty = async () => {
    setErrors({});
    const payload = {
      agency_id: agencyId,
      owner_customer_id: Number(ownerId),
      owner_tc_identity_no: ownerTc.trim(),
      title: title.trim(),
      listing_type: listingType,
      property_type: propertyType,
      price: Number(price),
      gross_sqm: Number(grossSqm),
      net_sqm: Number(netSqm),
      room_count: roomCount as '1+0' | '1+1' | '2+1' | '3+1' | '4+1' | '5+1',
      floor_number: Number(floorNumber),
      building_floors: Number(buildingFloors),
      heating_type: heatingType,
      city,
      district,
      neighborhood,
      address_detail: addressDetail.trim(),
      agent_description: description.trim(),
      status,
      image_url: imageUrl.trim() || null,
    };

    const parsed = propertySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodErrorsToMap(parsed.error));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await updatePropertyById(editingId, payload);
        onNotify(res.message);
      } else {
        const res = await createProperty(payload);
        onNotify(res.message);
      }
      setModalOpen(false);
      await loadPortfolio();
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'İlan kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (
    propertyId: number,
    nextStatus: PropertyStatus,
  ) => {
    try {
      const res = await updatePropertyStatus(propertyId, nextStatus);
      setProperties((prev) =>
        prev.map((p) => (p.id === propertyId ? res.property : p)),
      );
      onNotify(res.message);
      void loadPortfolio();
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Durum güncellenemedi.',
      );
    }
  };

  return (
    <PageContainer
      size="wide"
      title="Portföy Yönetimi"
      actions={
        <Button
          variant="primary"
          pill
          leftIcon={<Plus size={16} />}
          onClick={openCreateModal}
        >
          Yeni İlan Ekle
        </Button>
      }
    >
      {/* Üst Sekmeler ve Filtre Çubuğu */}
      <Card style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            variant="pills"
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { value: 'ALL', label: 'Tümü', count: counts.ALL },
              { value: 'AKTIF', label: 'Aktif', count: counts.AKTIF },
              { value: 'SATILDI', label: 'Satıldı', count: counts.SATILDI },
              {
                value: 'KIRALANDI',
                label: 'Kiralandı',
                count: counts.KIRALANDI,
              },
              { value: 'PASIF', label: 'Pasif', count: counts.PASIF },
            ]}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ width: '220px' }}>
              <Input
                inputSize="sm"
                pill
                icon={<Search size={14} />}
                placeholder="Portföy içinde ara..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            <Select
              selectSize="sm"
              pill
              value={listingTypeFilter}
              onChange={setListingTypeFilter}
              options={[
                { value: 'ALL', label: 'İşlem: Tümü' },
                { value: 'SATILIK', label: 'Satılık' },
                { value: 'KIRALIK', label: 'Kiralık' },
              ]}
            />

            <Select
              selectSize="sm"
              pill
              value={propertyTypeFilter}
              onChange={setPropertyTypeFilter}
              options={[
                { value: 'ALL', label: 'Tür: Tümü' },
                { value: 'DAIRE', label: 'Daire' },
                { value: 'VILLA', label: 'Villa' },
                { value: 'ISYERI', label: 'İşyeri' },
                { value: 'ARSA', label: 'Arsa' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* İlan Kartları Listesi (Kesilmeyen Başlıklı & Temiz Yatay Kartlar) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredList.map((p) => {
          const thumb = getPropertyGallery(p)[0];
          return (
            <Card key={p.id} padding="sm">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px minmax(0, 1fr) auto',
                  gap: '16px',
                  alignItems: 'center',
                }}
              >
                <img
                  src={thumb}
                  alt={p.title}
                  onClick={() => onSelectProperty(p)}
                  style={{
                    width: '130px',
                    height: '92px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {formatPriceTL(p.price)}
                    </span>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {formatListingTypeLabel(p.listing_type)}{' '}
                      {formatPropertyTypeLabel(p.property_type)} •{' '}
                      {p.room_count} • {p.gross_sqm} m² (Net {p.net_sqm} m²) •
                      Kat {p.floor_number}/{p.building_floors}
                    </span>
                  </div>

                  <div
                    onClick={() => onSelectProperty(p)}
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      marginTop: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {p.title}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      marginTop: '5px',
                      fontSize: '12.5px',
                      color: 'var(--color-text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MapPin size={13} color="var(--color-primary)" />
                      {p.district} / {p.city} ({p.neighborhood})
                    </span>
                    {p.owner && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={13} color="var(--color-whatsapp)" />
                        Mülk Sahibi: <strong>{p.owner.full_name}</strong> (T.C.{' '}
                        {p.owner.tc_identity_no})
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <Select
                    selectSize="sm"
                    pill
                    value={p.status}
                    onChange={(val) =>
                      void handleQuickStatusChange(
                        p.id,
                        val as PropertyStatus,
                      )
                    }
                    options={[
                      { value: 'AKTIF', label: 'Aktif' },
                      { value: 'SATILDI', label: 'Satıldı' },
                      { value: 'KIRALANDI', label: 'Kiralandı' },
                      { value: 'PASIF', label: 'Pasif' },
                    ]}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    leftIcon={<Edit3 size={13} />}
                    onClick={() => openEditModal(p)}
                  >
                    Düzenle
                  </Button>

                  <Button
                    variant="outline"
                    size="icon-sm"
                    pill
                    onClick={() =>
                      window.open(
                        buildPropertyPrintSheetUrl(p.id, null, true),
                        '_blank',
                      )
                    }
                    title="A4 Bilgi Fişi Yazdır"
                  >
                    <Printer size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    pill
                    onClick={() => onSelectProperty(p)}
                    title="İlan Detayına Git"
                  >
                    <ExternalLink size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Ortalanmış İlan Ekleme / Düzenleme Modalı (Yan Çekmece Yok!) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? 'Gayrimenkul İlanını Düzenle'
            : 'Yeni Gayrimenkul İlanı Ekle'
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              pill
              disabled={saving}
              onClick={() => void handleSaveProperty()}
            >
              {saving ? 'Kaydediliyor...' : 'İlanı Kaydet'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <Select
              label="Mülk Sahibi (Kayıtlı Müşteri)"
              value={String(ownerId)}
              onChange={(val) => {
                const cid = Number(val);
                setOwnerId(cid);
                const found = customers.find((c) => c.id === cid);
                if (found?.tc_identity_no) setOwnerTc(found.tc_identity_no);
              }}
              options={customers.map((c) => ({
                value: String(c.id),
                label: `${c.full_name} (${c.mobile_phone})`,
              }))}
              error={errors.owner_customer_id}
            />
            <Input
              label="Mülk Sahibi T.C. Kimlik No (11 Hane)"
              value={ownerTc}
              onChange={(e) =>
                setOwnerTc(formatDigitsOnly(e.target.value, 11))
              }
              error={errors.owner_tc_identity_no}
            />
          </div>

          <Input
            label="İlan Başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Örn: Çankaya Ayrancı'da Metroya Yakın 3+1 Satılık Daire"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            <Select
              label="İşlem Türü"
              value={listingType}
              onChange={(v) => setListingType(v as ListingType)}
              options={[
                { value: 'SATILIK', label: 'Satılık' },
                { value: 'KIRALIK', label: 'Kiralık' },
              ]}
            />
            <Select
              label="Emlak Türü"
              value={propertyType}
              onChange={(v) => setPropertyType(v as PropertyType)}
              options={[
                { value: 'DAIRE', label: 'Daire' },
                { value: 'VILLA', label: 'Villa' },
                { value: 'ISYERI', label: 'İşyeri' },
                { value: 'ARSA', label: 'Arsa' },
              ]}
            />
            <Select
              label="Oda Sayısı"
              value={roomCount}
              onChange={setRoomCount}
              options={['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'].map(
                (r) => ({ value: r, label: r }),
              )}
            />
            <Input
              label="Fiyat (TL)"
              value={price}
              onChange={(e) => setPrice(formatDigitsOnly(e.target.value, 11))}
              error={errors.price}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            <Input
              label="Brüt m²"
              value={grossSqm}
              onChange={(e) =>
                setGrossSqm(formatDigitsOnly(e.target.value, 5))
              }
              error={errors.gross_sqm}
            />
            <Input
              label="Net m²"
              value={netSqm}
              onChange={(e) => setNetSqm(formatDigitsOnly(e.target.value, 5))}
              error={errors.net_sqm}
            />
            <Input
              label="Bulunduğu Kat"
              value={floorNumber}
              onChange={(e) =>
                setFloorNumber(formatDigitsOnly(e.target.value, 2))
              }
              error={errors.floor_number}
            />
            <Input
              label="Bina Kat Sayısı"
              value={buildingFloors}
              onChange={(e) =>
                setBuildingFloors(formatDigitsOnly(e.target.value, 2))
              }
              error={errors.building_floors}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            <Select
              label="Isınma Tipi"
              value={heatingType}
              onChange={(v) => setHeatingType(v as HeatingType)}
              options={(
                [
                  'DOGALGAZ_KOMBI',
                  'MERKEZI',
                  'YERDEN_ISITMA',
                  'KLIMA',
                  'SOBA',
                ] as HeatingType[]
              ).map((h) => ({
                value: h,
                label: formatHeatingTypeLabel(h),
              }))}
            />
            <Select
              label="İl"
              value={city}
              onChange={setCity}
              options={provinces.map((p) => ({
                value: p.name,
                label: p.name,
              }))}
            />
            <Select
              label="İlçe"
              value={district}
              onChange={setDistrict}
              options={districts.map((d) => ({
                value: d.name,
                label: d.name,
              }))}
            />
            <Select
              label="Mahalle"
              value={neighborhood}
              onChange={setNeighborhood}
              options={neighborhoods.map((n) => ({
                value: n.name,
                label: n.name,
              }))}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <Input
              label="Açık Adres"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              error={errors.address_detail}
            />
            <Input
              label="Kapak Görseli URL (Opsiyonel)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <Input
            label="İlan Açıklaması"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.agent_description}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}

export default PropertiesPage;
