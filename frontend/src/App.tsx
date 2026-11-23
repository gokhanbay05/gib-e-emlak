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
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { AgencyProfileModule } from './components/AgencyProfileModule';
import {
  AuthModule,
  type SessionAgency,
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

type DbTableSummary = {
  [key: string]: unknown;
  table_name: string;
  module: string;
  description: string;
  row_count: number;
};

interface OverviewResponse {
  connected: boolean;
  info: string;
  tables: DbTableSummary[];
}

const DEFAULT_AGENT_SESSION: UserSession = {
  id: 1,
  full_name: 'Selim Karahan',
  email: 'selim@baskentvizyon.com.tr',
  phone: '0 (532) 411 22 33',
  role: 'AGENT',
  agency: {
    id: 1,
    name: 'Başkent Vizyon Gayrimenkul A.Ş.',
    authorized_person: 'Selim Karahan',
    phone: '0 (312) 468 10 20',
    mobile_phone: '0 (532) 411 22 33',
    fax: '0 (312) 468 10 21',
    city: 'Ankara',
    district: 'Çankaya',
    neighborhood: 'Kızılırmak Mah.',
    address: 'Dumlupınar Blv. Next Level A Blok No:3/42',
    ttbs_document_no: '0600482',
    is_ttbs_verified: true,
    logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200',
  },
  customer: null,
};

const ROADMAP_DATA: RoadmapItem[] = [
  {
    code: 'P0',
    title: 'Repo İskeleti, PostgreSQL & Astryx UI',
    scope: 'FastAPI + PostgreSQL 16 + React 19 + Astryx AppShell',
    status: 'Tamamlandı',
    commit: 'chore(P0): repo iskeleti, postgresql, astryx ui ve ai ajan rehberleri kuruldu',
  },
  {
    code: 'P1',
    title: 'PostgreSQL Şeması (8 Tablo) & Seed Data',
    scope: 'İlişkisel 8 tablo ve gerçekçi başlangıç verileri',
    status: 'Tamamlandı',
    commit: 'feat(P1): postgresql iliskisel veritabani semasi ve ornek seed verileri eklendi',
  },
  {
    code: 'P2',
    title: 'Kayıt / Giriş, TTBS Yetki Belgesi & Adres API',
    scope: 'Zod doğrulama, telefon maskesi, 5 MB logo yükleme, Türkiye İl/İlçe/Mahalle',
    status: 'Tamamlandı',
    commit: 'feat(P2): zod form dogrulama, turkiye il-ilce-mahalle, 5mb logo yukleme ve global toast eklendi',
  },
  {
    code: 'P3',
    title: 'İşyeri Tanımı & Kurumsal Layout (GİB Madde 1)',
    scope: 'TopNav + SideNav kurumsal tasarım, işyeri profili, vergi/fax/adres ve canlı PDF antet önizleme',
    status: 'Tamamlandı',
    commit: 'feat(P3): kurumsal layout, turkce adres aramasi ve isyeri tanimi ekrani',
  },
  {
    code: 'P4',
    title: 'Müşteri Yönetimi & Yan Panel Detay (GİB Madde 2)',
    scope: 'Alıcı/Satıcı/Kiralayan/Kiracı tablosu ve yan panel (Drawer) mülk inceleme',
    status: 'Sıradaki',
    commit: 'feat(P4): musteri yonetimi filtreleme tablosu ve yan panel gayrimenkul detay ekrani',
  },
  {
    code: 'P5',
    title: 'Portföy Yönetimi & Kimlik Kontrolü (GİB Madde 3)',
    scope: 'Sahipsiz ev yasağı, hızlı müşteri bağlama, TC Kimlik kontrolü ve emlakçı tasviri',
    status: 'Planlandı',
    commit: 'feat(P5): portfoy yonetimi sahipsiz ev engeli hizli musteri baglama ve kimlik kontrolu',
  },
  {
    code: 'P6',
    title: 'Detaylı İlan Arama & Yazıcı/PDF Çıktısı (GİB Madde 4)',
    scope: 'Çoklu filtreleme, müşteri talebi sorgulama ve kurumsal A4 PDF Bilgi Fişi',
    status: 'Planlandı',
    commit: 'feat(P6): detayli emlak arama filtreleme talep sorgulama ve yazici pdf ciktisi',
  },
  {
    code: 'P7',
    title: 'Müşteri Vitrini, Favoriler & Ev Satacağım Akışı',
    scope: 'Girişsiz ilan gezme/filtreleme, favoriler ve emlakçı listeleme',
    status: 'Planlandı',
    commit: 'feat(P7): musteri vitrini girissiz ilan gezme favoriler ve ev satacagim emlakci listeleme',
  },
  {
    code: 'P8',
    title: 'Randevu Yönetimi 1: Google Calendar & Saat Kapatma',
    scope: 'Saat dilimli takvim ve emlakçı manuel saat kapatma',
    status: 'Planlandı',
    commit: 'feat(P8): google calendar tarzi emlakci takvimi ve manuel saat kapatma sistemi',
  },
  {
    code: 'P9',
    title: 'Randevu Yönetimi 2: 6 Saat Kuralı & Geçmiş Notlar',
    scope: 'Fiziki/Telefon randevu, son 6 saat iptal engeli ve geçmiş randevu notları',
    status: 'Planlandı',
    commit: 'feat(P9): fiziki ve telefon randevu alma son 6 saat iptal kurali ve gecmis randevu notlari',
  },
  {
    code: 'P10',
    title: 'AI Doğal Dil Akıllı Arama & Müşteri–Ev Eşleştirme',
    scope: 'Doğal dil tasviriyle % uyum skorlu yapay zeka ilan eşleştirme',
    status: 'Planlandı',
    commit: 'feat(P10): yapay zeka destekli dogal dil akilli emlak arama ve musteri ev eslestirme',
  },
  {
    code: 'P11',
    title: 'Raporlama ve Performans Analitiği',
    scope: 'Randevu saat dağılımı, satılan/kiralanan evler ve müşteri kırılımı',
    status: 'Planlandı',
    commit: 'feat(P11): emlakci performans raporlama satis kiralama ve randevu saat istatistikleri',
  },
];

const AGENT_NAV_ITEMS = [
  { id: 'agency', label: 'İşyeri Tanımı', icon: 'building', piece: 'GİB-1' },
  { id: 'customers', label: 'Müşteri Yönetimi', icon: 'users', piece: 'P4' },
  { id: 'properties', label: 'Portföy (Emlak)', icon: 'home', piece: 'P5' },
  { id: 'search', label: 'İlan Arama & PDF Çıktı', icon: 'search', piece: 'P6' },
  { id: 'calendar', label: 'Randevu Takvimi', icon: 'calendar', piece: 'P8-P9' },
  { id: 'ai-match', label: 'AI Akıllı Eşleştirme', icon: 'sparkles', piece: 'P10' },
  { id: 'reports', label: 'Performans Raporları', icon: 'bar-chart', piece: 'P11' },
] as const;

export default function App() {
  const [selectedNav, setSelectedNav] = useState<string>('agency');
  const [currentUser, setCurrentUser] = useState<UserSession>(
    DEFAULT_AGENT_SESSION,
  );
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  const fetchDatabaseOverview = async () => {
    try {
      const response = await fetch('/api/system/overview');
      if (response.ok) {
        const data = (await response.json()) as OverviewResponse;
        setOverview(data);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    void fetchDatabaseOverview();
  }, []);

  const handleAgencyUpdated = (updatedAgency: SessionAgency) => {
    setCurrentUser((prev) => ({
      ...prev,
      agency: updatedAgency,
    }));
  };

  const tableColumns: TableColumn<DbTableSummary>[] = [
    {
      key: 'table_name',
      header: 'Tablo',
      renderCell: (item) => <Text type="code">{item.table_name}</Text>,
    },
    {
      key: 'module',
      header: 'Modül',
      renderCell: (item) => <Text weight="semibold">{item.module}</Text>,
    },
    {
      key: 'description',
      header: 'Açıklama',
    },
    {
      key: 'row_count',
      header: 'Kayıt',
      renderCell: (item) => (
        <Token label={`${item.row_count} kayıt`} color="blue" size="sm" />
      ),
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
          size="sm"
        />
      ),
    },
    {
      key: 'title',
      header: 'Modül',
      renderCell: (item) => <Text weight="semibold">{item.title}</Text>,
    },
    {
      key: 'scope',
      header: 'Kapsam',
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
          size="sm"
        />
      ),
    },
  ];

  const activeAgentNav = AGENT_NAV_ITEMS.find((i) => i.id === selectedNav);

  return (
    <AppShell
      contentPadding={4}
      variant="elevated"
      topNav={
        <TopNav
          heading={
            <HStack gap={1.5} vAlign="center">
              <Token label="GİB e-EMLAK" color="blue" />
              <Text weight="semibold">Kurumsal Taşınmaz Platformu</Text>
            </HStack>
          }
          centerContent={
            <HStack gap={1} vAlign="center">
              {currentUser.agency && (
                <Token
                  label={`${currentUser.agency.name} · TTBS ${currentUser.agency.ttbs_document_no}`}
                  color="green"
                  size="sm"
                />
              )}
              {currentUser.role === 'CUSTOMER' && (
                <Token label="Kayıtlı Müşteri Oturumu" color="teal" size="sm" />
              )}
              {currentUser.role === 'VISITOR' && (
                <Token label="Ziyaretçi (Girişsiz) Modu" color="orange" size="sm" />
              )}
            </HStack>
          }
          endContent={
            <HStack gap={1.5} vAlign="center">
              <Avatar
                name={currentUser.full_name}
                src={currentUser.agency?.logo_url ?? undefined}
                size="sm"
              />
              <Text size="sm" weight="medium">
                {currentUser.full_name}
              </Text>
              <Button
                label={
                  currentUser.role === 'VISITOR'
                    ? 'Giriş / Kayıt'
                    : 'Hesap Değiştir'
                }
                variant="secondary"
                size="sm"
                onClick={() => setSelectedNav('auth')}
              />
              {currentUser.role !== 'VISITOR' && (
                <Button
                  label="Çıkış"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentUser(VISITOR_SESSION)}
                />
              )}
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav
          collapsible
          header={
            <SideNavHeading
              superheading="T.C. GİB CASE"
              heading="GİB e-Emlak"
              subheading={
                currentUser.agency
                  ? currentUser.agency.name
                  : 'Taşınmaz Yönetim Sistemi'
              }
            />
          }
        >
          <SideNavSection title="Emlak İşletmesi Yönetimi">
            {AGENT_NAV_ITEMS.map((item) => (
              <SideNavItem
                key={item.id}
                label={item.label}
                isSelected={selectedNav === item.id}
                onClick={() => setSelectedNav(item.id)}
                endContent={
                  item.id === 'agency' ? (
                    <Token label="Aktif" color="green" size="sm" />
                  ) : (
                    <Token label={item.piece} size="sm" />
                  )
                }
              />
            ))}
          </SideNavSection>

          <SideNavSection title="Müşteri Vitrini">
            <SideNavItem
              label="Ortak İlan Vitrini"
              isSelected={selectedNav === 'marketplace'}
              onClick={() => setSelectedNav('marketplace')}
              endContent={<Token label="P7" size="sm" />}
            />
            <SideNavItem
              label="Evimi Sat / Emlakçı Seç"
              isSelected={selectedNav === 'sell-request'}
              onClick={() => setSelectedNav('sell-request')}
              endContent={<Token label="P7" size="sm" />}
            />
          </SideNavSection>

          <SideNavSection title="Hesap & Sistem">
            <SideNavItem
              label="Kayıt / Giriş & TTBS"
              isSelected={selectedNav === 'auth'}
              onClick={() => setSelectedNav('auth')}
              endContent={<Token label="Aktif" color="green" size="sm" />}
            />
            <SideNavItem
              label="Sistem & Yol Haritası"
              isSelected={selectedNav === 'system'}
              onClick={() => setSelectedNav('system')}
            />
          </SideNavSection>
        </SideNav>
      }
    >
      <Layout contentWidth={1280} padding={1}>
        {selectedNav === 'agency' ? (
          <AgencyProfileModule
            currentUser={currentUser}
            onAgencyUpdated={handleAgencyUpdated}
            onNavigateAuth={() => setSelectedNav('auth')}
          />
        ) : selectedNav === 'auth' ? (
          <AuthModule
            currentUser={currentUser}
            onSelectSession={(session) => setCurrentUser(session)}
            onDataChanged={() => void fetchDatabaseOverview()}
          />
        ) : selectedNav === 'system' ? (
          <VStack gap={4}>
            <Banner
              status={overview?.connected ? 'success' : 'info'}
              title={
                overview?.connected
                  ? 'PostgreSQL 16 Veritabanı ve FastAPI Servisi Aktif'
                  : 'Sistem Durumu'
              }
              description={
                overview?.info ?? 'PostgreSQL 16 + SQLAlchemy 2.0 + Astryx Neutral'
              }
              collapsible={false}
            />

            <Section padding={4}>
              <VStack gap={3}>
                <Heading level={2}>PostgreSQL İlişkisel Tabloları (8 Tablo)</Heading>
                <Divider />
                <Table
                  data={overview?.tables ?? []}
                  columns={tableColumns}
                  idKey="table_name"
                  hasHover
                />
              </VStack>
            </Section>

            <Section padding={4}>
              <VStack gap={3}>
                <Heading level={2}>Geliştirme Yol Haritası (P0 – P11)</Heading>
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
          </VStack>
        ) : (
          <Section padding={4}>
            <VStack gap={3}>
              <HStack gap={1.5} vAlign="center">
                <Token
                  label={activeAgentNav?.piece ?? 'P7'}
                  color="orange"
                />
                <Heading level={2}>
                  {activeAgentNav?.label ?? 'Müşteri Vitrini Modülü'}
                </Heading>
              </HStack>
              <Text color="secondary">
                Bu modül sıradaki parça kapsamında aktif edilecektir. Şu an
                **İşyeri Tanımı (GİB Madde 1)** ve **Kayıt / Giriş & TTBS Yetki
                Belgesi Doğrulama** ekranlarını tam fonksiyonlu olarak
                kullanabilirsiniz.
              </Text>
              <Grid columns={{ minWidth: 220, max: 2 }} gap={2}>
                <Card padding={3}>
                  <VStack gap={1}>
                    <Heading level={4}>İşyeri Tanımı (GİB Madde 1)</Heading>
                    <Text color="secondary" size="sm">
                      İşletme bilgileri, vergi no, fax, adres ve canlı PDF antet
                      önizlemesi.
                    </Text>
                    <HStack>
                      <Button
                        label="İşyeri Tanımına Git"
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedNav('agency')}
                      />
                    </HStack>
                  </VStack>
                </Card>
                <Card padding={3}>
                  <VStack gap={1}>
                    <Heading level={4}>Kayıt / Giriş & TTBS</Heading>
                    <Text color="secondary" size="sm">
                      Emlakçı / Müşteri kaydı, TTBS 7 haneli yetki belgesi
                      doğrulaması ve oturum geçişi.
                    </Text>
                    <HStack>
                      <Button
                        label="Hesap Ekranına Git"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedNav('auth')}
                      />
                    </HStack>
                  </VStack>
                </Card>
              </Grid>
            </VStack>
          </Section>
        )}
      </Layout>
    </AppShell>
  );
}
