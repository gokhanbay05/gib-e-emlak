import { useEffect, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout } from '@astryxdesign/core/Layout';
import { Section } from '@astryxdesign/core/Section';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import {
  AuthModule,
  type UserSession,
  VISITOR_SESSION,
} from './components/AuthModule';

type RoadmapItem = {
  [key: string]: unknown;
  code: string;
  title: string;
  scope: string;
  status: 'Tamamlandı' | 'Sıradaki' | 'Planlandı';
  commit: string;
};

type BusinessRuleItem = {
  [key: string]: unknown;
  code: string;
  module: string;
  rule: string;
};

type DbTableSummary = {
  [key: string]: unknown;
  table_name: string;
  module: string;
  description: string;
  row_count: number;
};

type SamplePropertyItem = {
  [key: string]: unknown;
  id: number;
  title: string;
  listing_type: string;
  property_type: string;
  room_count: string;
  net_sqm: number;
  floor_info: string;
  heating_type: string;
  price: number;
  location: string;
  owner_name: string;
  agency_name: string;
  status: string;
};

type SampleCustomerItem = {
  [key: string]: unknown;
  id: number;
  full_name: string;
  customer_type: string;
  mobile_phone: string;
  home_phone: string;
  tc_identity_no: string;
  source: string;
};

interface OverviewResponse {
  connected: boolean;
  info: string;
  tables: DbTableSummary[];
  sample_customers: SampleCustomerItem[];
  sample_properties: SamplePropertyItem[];
}

const DEFAULT_AGENT_SESSION: UserSession = {
  id: 1,
  full_name: 'Selim Karahan',
  email: 'selim@baskentvizyon.com.tr',
  phone: '0532 411 22 33',
  role: 'AGENT',
  agency: {
    id: 1,
    name: 'Başkent Vizyon Gayrimenkul A.Ş.',
    authorized_person: 'Selim Karahan',
    phone: '0312 468 10 20',
    mobile_phone: '0532 411 22 33',
    fax: '0312 468 10 21',
    address:
      'Kızılırmak Mah. Dumlupınar Blv. Next Level A Blok No:3/42 Çankaya / Ankara',
    ttbs_document_no: '0600482',
    is_ttbs_verified: true,
    logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200',
  },
  customer: null,
};

const DEFAULT_TABLES: DbTableSummary[] = [
  {
    table_name: 'agencies',
    module: '1. İşyeri Tanımı (GİB Madde 1)',
    description:
      'Emlak işletmeleri, Yetkili, Adres, Tel, Fax, Vergi No ve TTBS Yetki Belgesi',
    row_count: 2,
  },
  {
    table_name: 'users',
    module: 'Kullanıcı & Rol Hesapları',
    description:
      'Emlakçı (AGENT) ve Kayıtlı Müşteri (CUSTOMER) tekil e-posta giriş hesapları',
    row_count: 4,
  },
  {
    table_name: 'customers',
    module: '2. Müşteri Tanımı (GİB Madde 2)',
    description:
      'Alıcı, Satıcı, Kiralık Mülk Sahibi (Kiralayan) ve Kiracı müşteriler (Ev/Cep Tel, TC No)',
    row_count: 6,
  },
  {
    table_name: 'properties',
    module: '3. Emlak / Portföy Tanımı (GİB Madde 3)',
    description:
      'Satılık/Kiralık ilanlar, m², oda, kat, bina katı, ısınma, emlakçı tasviri ve mülk sahibi bağı',
    row_count: 8,
  },
  {
    table_name: 'customer_search_requests',
    module: '4. Emlak Arama Talepleri (GİB Madde 4)',
    description:
      'Alıcı ve kiracı müşterilerin aradıkları emlak kriterleri ve doğal dil arama istemleri',
    row_count: 2,
  },
  {
    table_name: 'appointments',
    module: 'Randevu Yönetimi',
    description:
      'Fiziki ve telefon randevuları, 6 saat iptal kuralı takibi ve geçmiş görüşme notları',
    row_count: 3,
  },
  {
    table_name: 'blocked_slots',
    module: 'Takvim Saat Kapatma',
    description:
      'Emlakçının müsait olmadığı saat aralıklarını (örn. 19:00-20:00) manuel kapatma kayıtları',
    row_count: 2,
  },
  {
    table_name: 'favorites',
    module: 'Müşteri Vitrini Favoriler',
    description:
      'Giriş yapan müşterilerin favorilerine eklediği gayrimenkul ilanları',
    row_count: 2,
  },
];

const ROADMAP_DATA: RoadmapItem[] = [
  {
    code: 'P0',
    title: 'Repo İskeleti, PostgreSQL Bağlantısı & Astryx UI Kurulumu',
    scope: 'FastAPI + PostgreSQL 16 + React 19 + Astryx AppShell + AI_CONTEXT.md',
    status: 'Tamamlandı',
    commit: 'chore(P0): repo iskeleti, postgresql, astryx ui ve ai ajan rehberleri kuruldu',
  },
  {
    code: 'P1',
    title: 'PostgreSQL İlişkisel Veritabanı Şeması (8 Tablo) & Seed Data',
    scope: 'agencies, users, customers, properties, requests, appointments, blocked_slots, favorites',
    status: 'Tamamlandı',
    commit: 'feat(P1): postgresql iliskisel veritabani semasi ve ornek seed verileri eklendi',
  },
  {
    code: 'P2',
    title: 'Kullanıcı Kayıt / Giriş (Emlakçı & Müşteri) ve Yetki Belgesi Kontrolü',
    scope: 'Ortak ve emlakçıya özel kayıt alanları, tekil e-posta, TTBS Yetki Belgesi doğrulama, ziyaretçi geçişi',
    status: 'Tamamlandı',
    commit: 'feat(P2): emlakci ve musteri kayit giris ekranlari ile yetki belgesi dogrulama',
  },
  {
    code: 'P3',
    title: 'İşyeri (Emlak Ofisi) Tanımı ve Kurumsal Profil Yönetimi (GİB Madde 1)',
    scope: 'İşletme adı, Yetkili, Adres, Sabit/Cep Tel, Fax, Vergi No, TTBS Belge No ve Ofis Logosu',
    status: 'Sıradaki',
    commit: 'feat(P3): isyeri tanimi ekrani ve emlak ofisi kurumsal bilgi yonetimi',
  },
  {
    code: 'P4',
    title: 'Müşteri Yönetimi, Filtreleme Tablosu & Yan Panel Detay (GİB Madde 2)',
    scope: 'Alıcı/Satıcı/Kiralayan/Kiracı kaydı, ev/cep tel, filtreleme tablosu ve yan panelde mülk inceleme',
    status: 'Planlandı',
    commit: 'feat(P4): musteri yonetimi filtreleme tablosu ve yan panel gayrimenkul detay ekrani',
  },
  {
    code: 'P5',
    title: 'Portföy Yönetimi, "Sahipsiz Ev Olmaz" & Kimlik Kontrolü (GİB Madde 3)',
    scope: 'Emlak kaydı (m², oda, kat, bina katı, ısınma, emlakçı tasviri), hızlı müşteri bağlama ve TC Kimlik kontrolü',
    status: 'Planlandı',
    commit: 'feat(P5): portfoy yonetimi sahipsiz ev engeli hizli musteri baglama ve kimlik kontrolu',
  },
  {
    code: 'P6',
    title: 'Detaylı İlan Arama, Çoklu Filtreleme & Yazıcı / PDF Çıktısı (GİB Madde 4)',
    scope: 'Müşteri talebi sorgulama, tüm özelliklere göre detaylı filtreleme ve kurumsal A4 PDF Bilgi Fişi çıktısı',
    status: 'Planlandı',
    commit: 'feat(P6): detayli emlak arama filtreleme talep sorgulama ve yazici pdf ciktisi',
  },
  {
    code: 'P7',
    title: 'Müşteri Vitrini: Girişsiz İlan Gezme, Favoriler & Ev Satacağım Akışı',
    scope: 'Girişsiz tüm ilanları görme/filtreleme, üye müşteriye özel favoriler ve emlakçı listeleyip ev satma başvurusu',
    status: 'Planlandı',
    commit: 'feat(P7): musteri vitrini girissiz ilan gezme favoriler ve ev satacagim emlakci listeleme',
  },
  {
    code: 'P8',
    title: 'Randevu Yönetimi 1: Google Calendar Takvim Görünümü & Manuel Saat Kapatma',
    scope: 'Haftalık/günlük saat dilimli takvim, emlakçı müsaitlik görünümü ve 19:00-20:00 gibi saatleri manuel kapatma',
    status: 'Planlandı',
    commit: 'feat(P8): google calendar tarzi emlakci takvimi ve manuel saat kapatma sistemi',
  },
  {
    code: 'P9',
    title: 'Randevu Yönetimi 2: Fiziki/Telefon Randevu, 6 Saat Kuralı & Geçmiş Notlar',
    scope: 'Fiziki veya telefon randevusu alma, son 6 saat kala iptal engeli ve tarih aralığıyla geçmiş randevulara not ekleme',
    status: 'Planlandı',
    commit: 'feat(P9): fiziki ve telefon randevu alma son 6 saat iptal kurali ve gecmis randevu notlari',
  },
  {
    code: 'P10',
    title: 'Yapay Zeka (AI) Destekli Doğal Dil Akıllı Arama & Müşteri–Ev Eşleştirme',
    scope: 'Doğal dil tasviri ile % uyum skorlu ilan bulma ve Müşteri Yönetimi ekranı içinde Akıllı Eşleştirme',
    status: 'Planlandı',
    commit: 'feat(P10): yapay zeka destekli dogal dil akilli emlak arama ve musteri ev eslestirme',
  },
  {
    code: 'P11',
    title: 'Raporlama ve Performans Analitiği Ekranı',
    scope: 'Kaçta randevu oluştuğu, satılan/kiralanan ev sayıları ve müşteri bazlı satış/kiralama istatistikleri',
    status: 'Planlandı',
    commit: 'feat(P11): emlakci performans raporlama satis kiralama ve randevu saat istatistikleri',
  },
];

const BUSINESS_RULES: BusinessRuleItem[] = [
  {
    code: 'BR-01',
    module: 'İşyeri & Kayıt',
    rule: 'Emlakçı kaydında Taşınmaz Ticareti Yetki Belge No (TTBS) doğrulanmadan hesap aktifleşemez.',
  },
  {
    code: 'BR-02',
    module: 'Kullanıcı Hesabı',
    rule: 'E-posta adresi sistem genelinde tekildir; aynı e-posta ile mükerrer kayıt açılamaz.',
  },
  {
    code: 'BR-03',
    module: 'Portföy (Emlak)',
    rule: 'Sahipsiz ev kaydedilemez (owner_customer_id zorunlu). Müşteri yoksa form içinden anında eklenip bağlanır.',
  },
  {
    code: 'BR-04',
    module: 'Kimlik Doğrulama',
    rule: 'İlan yüklenirken mülk sahibinin 11 haneli TC Kimlik Numarası doğrulanır.',
  },
  {
    code: 'BR-05',
    module: 'Arama & PDF Çıktı',
    rule: 'Detaylı arama sonucunda uygun emlak bulunduğunda ofis logolu kurumsal yazıcı/PDF bilgi fişi üretilir.',
  },
  {
    code: 'BR-06',
    module: 'Takvim Bloklama',
    rule: 'Emlakçı onaylı randevusu olan bir saati manuel kapatmaya çalışırsa sistem çakışma uyarısı verir.',
  },
  {
    code: 'BR-07',
    module: 'Randevu İptali',
    rule: 'Randevu saatine 6 saatten az süre kalmışsa iptal işlemi hem UI hem API katmanında engellenir.',
  },
  {
    code: 'BR-08',
    module: 'Rol & Vitrin',
    rule: 'Ziyaretçiler tüm ilanları görebilir ve filtreleyebilir; AI Doğal Dil Arama, Favoriler ve Randevu için giriş şarttır.',
  },
];

const NAV_ITEMS = [
  { id: 'auth', label: 'Kayıt / Giriş & TTBS Kontrolü', piece: 'P2' },
  { id: 'database', label: 'PostgreSQL Şeması & Veriler', piece: 'P1' },
  { id: 'overview', label: 'Mimari & Yol Haritası (P0-P11)', piece: 'P0' },
  { id: 'agency', label: '1. İşyeri Tanımı (GİB-1)', piece: 'P3' },
  { id: 'customers', label: '2. Müşteri Yönetimi (GİB-2)', piece: 'P4' },
  { id: 'properties', label: '3. Portföy & Emlak (GİB-3)', piece: 'P5' },
  { id: 'search', label: '4. Detaylı Arama & PDF (GİB-4)', piece: 'P6' },
  { id: 'calendar', label: 'Randevu Takvimi & Saat Kapatma', piece: 'P8-P9' },
  { id: 'ai-match', label: 'AI Doğal Dil Eşleştirme', piece: 'P10' },
  { id: 'reports', label: 'Performans Raporları', piece: 'P11' },
] as const;

export default function App() {
  const [selectedNav, setSelectedNav] = useState<string>('auth');
  const [currentUser, setCurrentUser] = useState<UserSession>(
    DEFAULT_AGENT_SESSION,
  );
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchDatabaseOverview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system/overview');
      if (response.ok) {
        const data = (await response.json()) as OverviewResponse;
        setOverview(data);
      } else {
        setOverview(null);
      }
    } catch {
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDatabaseOverview();
  }, []);

  const tableColumns: TableColumn<DbTableSummary>[] = [
    {
      key: 'table_name',
      header: 'PostgreSQL Tablo Adı',
      renderCell: (item) => <Text type="code">{item.table_name}</Text>,
    },
    {
      key: 'module',
      header: 'İlgili Modül',
      renderCell: (item) => <Text weight="semibold">{item.module}</Text>,
    },
    {
      key: 'description',
      header: 'Saklanan Veri ve İlişkisel Bağlam',
    },
    {
      key: 'row_count',
      header: 'Kayıt Sayısı',
      renderCell: (item) => (
        <Token label={`${item.row_count} kayıt`} color="blue" />
      ),
    },
  ];

  const propertyColumns: TableColumn<SamplePropertyItem>[] = [
    {
      key: 'title',
      header: 'İlan Başlığı',
      renderCell: (item) => <Text weight="semibold">{item.title}</Text>,
    },
    {
      key: 'listing_type',
      header: 'İşlem / Tür',
      renderCell: (item) => (
        <Token
          label={`${item.listing_type} · ${item.property_type}`}
          color={item.listing_type === 'KIRALIK' ? 'teal' : 'blue'}
        />
      ),
    },
    {
      key: 'room_count',
      header: 'Oda & m²',
      renderCell: (item) => (
        <Text>{`${item.room_count} · ${item.net_sqm} m² (${item.floor_info})`}</Text>
      ),
    },
    {
      key: 'owner_name',
      header: 'Mülk Sahibi (BR-03)',
      renderCell: (item) => <Text weight="medium">{item.owner_name}</Text>,
    },
    {
      key: 'price',
      header: 'Fiyat',
      renderCell: (item) => (
        <Text weight="semibold">
          {`${item.price.toLocaleString('tr-TR')} TL`}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      renderCell: (item) => (
        <Token
          label={item.status}
          color={item.status === 'AKTIF' ? 'green' : 'orange'}
        />
      ),
    },
  ];

  const customerColumns: TableColumn<SampleCustomerItem>[] = [
    {
      key: 'full_name',
      header: 'Müşteri Adı Soyadı',
      renderCell: (item) => <Text weight="semibold">{item.full_name}</Text>,
    },
    {
      key: 'customer_type',
      header: 'Müşteri Tipi',
      renderCell: (item) => (
        <Token
          label={item.customer_type}
          color={
            item.customer_type === 'KIRALAYAN' || item.customer_type === 'SATICI'
              ? 'purple'
              : 'teal'
          }
        />
      ),
    },
    {
      key: 'mobile_phone',
      header: 'Cep Telefonu',
    },
    {
      key: 'home_phone',
      header: 'Ev Telefonu',
    },
    {
      key: 'tc_identity_no',
      header: 'TC Kimlik No (BR-04)',
      renderCell: (item) => <Text type="code">{item.tc_identity_no}</Text>,
    },
    {
      key: 'source',
      header: 'Kayıt Kaynağı',
      renderCell: (item) => <Token label={item.source} color="gray" />,
    },
  ];

  const roadmapColumns: TableColumn<RoadmapItem>[] = [
    {
      key: 'code',
      header: 'Parça',
      renderCell: (item) => (
        <Token
          label={item.code}
          color={
            item.status === 'Tamamlandı'
              ? 'green'
              : item.status === 'Sıradaki'
                ? 'blue'
                : 'gray'
          }
        />
      ),
    },
    {
      key: 'title',
      header: 'Modül & Başlık',
      renderCell: (item) => <Text weight="semibold">{item.title}</Text>,
    },
    {
      key: 'scope',
      header: 'Detaylı Kapsam & Ekran Özellikleri',
    },
    {
      key: 'status',
      header: 'Durum',
      renderCell: (item) => (
        <Token
          label={item.status}
          color={
            item.status === 'Tamamlandı'
              ? 'green'
              : item.status === 'Sıradaki'
                ? 'orange'
                : 'default'
          }
        />
      ),
    },
    {
      key: 'commit',
      header: 'Standart Commit Mesajı',
      renderCell: (item) => <Text type="code">{item.commit}</Text>,
    },
  ];

  const ruleColumns: TableColumn<BusinessRuleItem>[] = [
    {
      key: 'code',
      header: 'Kural Kodu',
      renderCell: (item) => <Token label={item.code} color="purple" />,
    },
    {
      key: 'module',
      header: 'Modül',
      renderCell: (item) => <Text weight="medium">{item.module}</Text>,
    },
    {
      key: 'rule',
      header: 'Zorunlu İş Kuralı',
    },
  ];

  const activeNavObj =
    NAV_ITEMS.find((item) => item.id === selectedNav) ?? NAV_ITEMS[0];

  const displayedTables =
    overview && overview.tables.length > 0 ? overview.tables : DEFAULT_TABLES;

  return (
    <AppShell
      contentPadding={4}
      sideNav={
        <SideNav
          collapsible
          header={
            <SideNavHeading
              superheading="GİB İŞ ANALİSTİ CASE"
              heading="GİB e-Emlak"
              subheading="Taşınmaz Yönetim Platformu"
            />
          }
        >
          <SideNavSection title="Emlak İşletmesi Paneli">
            {NAV_ITEMS.map((item) => (
              <SideNavItem
                key={item.id}
                label={item.label}
                isSelected={selectedNav === item.id}
                onClick={() => setSelectedNav(item.id)}
                endContent={<Token label={item.piece} size="sm" />}
              />
            ))}
          </SideNavSection>

          <SideNavSection title="Müşteri & Vitrin Modülü">
            <SideNavItem
              label="Ortak İlan Vitrini & Filtreleme"
              isSelected={selectedNav === 'marketplace'}
              onClick={() => setSelectedNav('marketplace')}
              endContent={<Token label="P7" size="sm" />}
            />
            <SideNavItem
              label="Evimi Sat / Emlakçı Listele"
              isSelected={selectedNav === 'sell-request'}
              onClick={() => setSelectedNav('sell-request')}
              endContent={<Token label="P7" size="sm" />}
            />
          </SideNavSection>
        </SideNav>
      }
    >
      <Layout padding={2}>
        <VStack gap={4}>
          <Section padding={4}>
            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <VStack gap={1}>
                <HStack gap={1.5} vAlign="center" wrap="wrap">
                  <Token label="PARÇA P2 AKTİF" color="green" />
                  <Token
                    label={
                      currentUser.role === 'AGENT'
                        ? `EMLAKÇI: ${currentUser.full_name}`
                        : currentUser.role === 'CUSTOMER'
                          ? `MÜŞTERİ: ${currentUser.full_name}`
                          : 'ZİYARETÇİ (GİRİŞSİZ MOD)'
                    }
                    color={
                      currentUser.role === 'AGENT'
                        ? 'blue'
                        : currentUser.role === 'CUSTOMER'
                          ? 'teal'
                          : 'orange'
                    }
                  />
                  {currentUser.agency && (
                    <Token
                      label={`${currentUser.agency.name} · TTBS: ${currentUser.agency.ttbs_document_no}`}
                      color="purple"
                    />
                  )}
                </HStack>
                <Heading level={1}>
                  GİB e-Emlak — Kurumsal Taşınmaz ve Emlak İşletmesi Platformu
                </Heading>
                <Text color="secondary">
                  Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi doğrulamalı
                  emlak işletmesi ve müşteri yönetim sistemi.
                </Text>
              </VStack>

              <HStack gap={1.5} vAlign="center" wrap="wrap">
                <Avatar
                  name={currentUser.full_name}
                  src={currentUser.agency?.logo_url ?? undefined}
                  size="md"
                />
                {currentUser.role !== 'VISITOR' ? (
                  <Button
                    label="Çıkış Yap (Ziyaretçi Modu)"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentUser(VISITOR_SESSION)}
                  />
                ) : (
                  <Button
                    label="Emlakçı / Müşteri Girişi"
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedNav('auth')}
                  />
                )}
              </HStack>
            </HStack>
          </Section>

          {selectedNav === 'auth' ? (
            <AuthModule
              currentUser={currentUser}
              onSelectSession={(session) => setCurrentUser(session)}
              onDataChanged={() => void fetchDatabaseOverview()}
            />
          ) : selectedNav === 'database' ? (
            <VStack gap={4}>
              {overview?.connected ? (
                <Banner
                  status="success"
                  title="PostgreSQL 16 Veritabanı Aktif — 8 Tablo ve Başlangıç Verileri Yüklendi"
                  description={`Canlı Bağlantı: ${overview.info}`}
                  collapsible={false}
                />
              ) : (
                <Banner
                  status="info"
                  title="PostgreSQL Şeması (8 Tablo) ve Seed Verileri Hazır"
                  description="Canlı veritabanı sorgusu için Docker PostgreSQL ve FastAPI sunucusunu çalıştırın."
                  collapsible={false}
                />
              )}

              <Section padding={4}>
                <VStack gap={3}>
                  <HStack justify="between" vAlign="center" wrap="wrap">
                    <VStack gap={0.5}>
                      <Heading level={2}>
                        P1 — PostgreSQL İlişkisel Veritabanı Şeması (8 Ana Tablo)
                      </Heading>
                      <Text color="secondary" size="sm">
                        P2–P11 arasındaki tüm parçalar aşağıda tanımlanan
                        ilişkisel PostgreSQL tabloları üzerinde çalışır.
                      </Text>
                    </VStack>
                    <Button
                      label="Tabloları Yenile"
                      variant="secondary"
                      size="sm"
                      isLoading={isLoading}
                      onClick={() => void fetchDatabaseOverview()}
                    />
                  </HStack>
                  <Divider />
                  <Table
                    data={displayedTables}
                    columns={tableColumns}
                    idKey="table_name"
                    hasHover
                    isStriped
                  />
                </VStack>
              </Section>

              {overview && overview.sample_properties.length > 0 && (
                <Section padding={4}>
                  <VStack gap={3}>
                    <VStack gap={0.5}>
                      <Heading level={2}>
                        PostgreSQL Başlangıç Portföy Kayıtları (properties)
                      </Heading>
                      <Text color="secondary" size="sm">
                        Her gayrimenkul kaydı zorunlu olarak bir mülk sahibi
                        müşteriye (owner_customer_id) ve yetki belgeli emlak
                        işletmesine (agency_id) bağlıdır.
                      </Text>
                    </VStack>
                    <Divider />
                    <Table
                      data={overview.sample_properties}
                      columns={propertyColumns}
                      idKey="id"
                      hasHover
                    />
                  </VStack>
                </Section>
              )}

              {overview && overview.sample_customers.length > 0 && (
                <Section padding={4}>
                  <VStack gap={3}>
                    <VStack gap={0.5}>
                      <Heading level={2}>
                        PostgreSQL Başlangıç Müşteri Kayıtları (customers)
                      </Heading>
                      <Text color="secondary" size="sm">
                        GİB Senaryosuna uygun Alıcı, Satıcı, Kiralık Mülk Sahibi
                        (Kiralayan) ve Kiracı müşteri kayıtları.
                      </Text>
                    </VStack>
                    <Divider />
                    <Table
                      data={overview.sample_customers}
                      columns={customerColumns}
                      idKey="id"
                      hasHover
                    />
                  </VStack>
                </Section>
              )}
            </VStack>
          ) : selectedNav === 'overview' ? (
            <VStack gap={4}>
              <Grid columns={{ minWidth: 260, max: 4 }} gap={3}>
                <Card padding={4}>
                  <VStack gap={1}>
                    <Token label="GİB Madde 1 (P2-P3)" color="blue" />
                    <Heading level={3}>1. İşyeri Tanımı & TTBS</Heading>
                    <Text color="secondary" size="sm">
                      İşletme adı, Yetkili, Adres, Telefon, Fax, Vergi No ve
                      Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi
                      doğrulaması.
                    </Text>
                  </VStack>
                </Card>

                <Card padding={4}>
                  <VStack gap={1}>
                    <Token label="GİB Madde 2 (P4)" color="teal" />
                    <Heading level={3}>2. Müşteri Yönetimi</Heading>
                    <Text color="secondary" size="sm">
                      Alıcı, Satıcı, Kiralayan ve Kiracı müşterilerin kaydı,
                      ev/cep telefonu ve sayfadan çıkmadan yan panelde (Drawer)
                      mülk inceleme.
                    </Text>
                  </VStack>
                </Card>

                <Card padding={4}>
                  <VStack gap={1}>
                    <Token label="GİB Madde 3 (P5)" color="purple" />
                    <Heading level={3}>3. Portföy & Emlak Tanımı</Heading>
                    <Text color="secondary" size="sm">
                      Sahipsiz ev yasağı, form içinden hızlı müşteri bağlama,
                      TC Kimlik kontrolü, m², oda, kat, ısınma ve emlakçı özel
                      tasviri.
                    </Text>
                  </VStack>
                </Card>

                <Card padding={4}>
                  <VStack gap={1}>
                    <Token label="GİB Madde 4 (P6-P10)" color="green" />
                    <Heading level={3}>4. Detaylı Arama, PDF & AI</Heading>
                    <Text color="secondary" size="sm">
                      Çoklu filtreleme, müşteri talebi sorgulama, kurumsal A4
                      yazıcı/PDF bilgi fişi çıktısı ve AI doğal dil eşleştirme.
                    </Text>
                  </VStack>
                </Card>
              </Grid>

              <Section padding={4}>
                <VStack gap={3}>
                  <VStack gap={0.5}>
                    <Heading level={2}>
                      Önem ve Karmaşıklık Sırasına Göre Geliştirme Planı (P0 – P11)
                    </Heading>
                    <Text color="secondary" size="sm">
                      Temel omurgadan başlayıp takvim, AI doğal dil arama ve
                      performans raporlamasına uzanan adım adım geliştirme sırası.
                    </Text>
                  </VStack>
                  <Divider />
                  <Table
                    data={ROADMAP_DATA}
                    columns={roadmapColumns}
                    idKey="code"
                    hasHover
                    isStriped
                  />
                </VStack>
              </Section>

              <Section padding={4}>
                <VStack gap={3}>
                  <VStack gap={0.5}>
                    <Heading level={2}>Çekirdek İş Kuralları (BR-01 – BR-08)</Heading>
                    <Text color="secondary" size="sm">
                      Uygulama genelinde hem arayüz hem API katmanında zorunlu
                      tutulan iş kuralları.
                    </Text>
                  </VStack>
                  <Divider />
                  <Table
                    data={BUSINESS_RULES}
                    columns={ruleColumns}
                    idKey="code"
                    hasHover
                  />
                </VStack>
              </Section>
            </VStack>
          ) : (
            <Section padding={4}>
              <VStack gap={2}>
                <HStack gap={1.5} vAlign="center">
                  <Token label={activeNavObj.piece} color="orange" />
                  <Heading level={2}>{activeNavObj.label}</Heading>
                </HStack>
                <Text color="secondary">
                  Bu ekran modülü planlanan geliştirme sırasına göre{' '}
                  {activeNavObj.piece} parçasında aktif edilecektir.
                </Text>
                <HStack gap={1.5}>
                  <Button
                    label="Kayıt / Giriş & TTBS Ekranına Dön (P2)"
                    variant="primary"
                    onClick={() => setSelectedNav('auth')}
                  />
                  <Button
                    label="P0-P11 Yol Haritasını Gör"
                    variant="secondary"
                    onClick={() => setSelectedNav('overview')}
                  />
                </HStack>
              </VStack>
            </Section>
          )}
        </VStack>
      </Layout>
    </AppShell>
  );
}
