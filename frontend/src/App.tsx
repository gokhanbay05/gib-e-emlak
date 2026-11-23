import { useEffect, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
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

interface HealthResponse {
  status: string;
  current_piece: string;
  database: {
    engine: string;
    connected: boolean;
    info: string;
  };
}

const ROADMAP_DATA: RoadmapItem[] = [
  {
    code: 'P0',
    title: 'Repo İskeleti, PostgreSQL & Astryx Kurulumu',
    scope: 'FastAPI + PostgreSQL 16 + React 19 + Astryx AppShell + AI_CONTEXT.md',
    status: 'Tamamlandı',
    commit: 'chore(P0): repo iskeleti postgresql ve astryx design system kurulumu',
  },
  {
    code: 'P1',
    title: 'PostgreSQL İlişkisel Şema (7 Tablo) & Seed Data',
    scope: 'agencies, users, customers, properties, requests, appointments, favorites',
    status: 'Sıradaki',
    commit: 'feat(P1): postgresql iliskisel veritabani semasi ve ornek seed verileri',
  },
  {
    code: 'P2',
    title: 'Auth, İşyeri Tanımı & TTBS Yetki Belgesi Doğrulama',
    scope: 'GİB Madde 1 İşyeri Tanımı + Ticaret Bakanlığı Yetki Belgesi Kontrolü',
    status: 'Planlandı',
    commit: 'feat(P2): auth kurgusu isyeri tanimi ve ticaret bakanligi yetki belgesi dogrulama',
  },
  {
    code: 'P3',
    title: 'Müşteri Yönetimi & Yan Panel (Drawer) Detay',
    scope: 'GİB Madde 2 Alıcı/Satıcı/Kiralayan/Kiracı Tablosu + Sağdan Açılan Detay',
    status: 'Planlandı',
    commit: 'feat(P3): musteri yonetimi ekranlari filtreleme ve yan panel detay gorunumu',
  },
  {
    code: 'P4',
    title: 'Portföy Yönetimi (Sahipsiz Ev Olmaz & Kimlik Kontrolü)',
    scope: 'GİB Madde 3 Emlak Kaydı + Hızlı Müşteri Bağlama + TC Kimlik Doğrulama',
    status: 'Planlandı',
    commit: 'feat(P4): portfoy yonetimi sahipsiz ev engeli hizli musteri baglama ve kimlik kontrolu',
  },
  {
    code: 'P5',
    title: 'Emlak Arama, Talep Eşleştirme & Yazıcı/PDF Çıktısı',
    scope: 'GİB Madde 4 & Altın Senaryo Tamamlanması + Kurumsal A4 Bilgi Fişi PDF',
    status: 'Planlandı',
    commit: 'feat(P5): musteri talebine gore emlak arama ve kurumsal yazici pdf ciktisi',
  },
  {
    code: 'P6',
    title: 'Yapay Zeka (AI) Doğal Dil Akıllı Arama & Eşleştirme',
    scope: 'Doğal dil tasviri ile % uyum skorlu ilan bulma ve müşteri eşleştirme',
    status: 'Planlandı',
    commit: 'feat(P6): yapay zeka destekli dogal dil akilli emlak arama ve musteri eslestirme',
  },
  {
    code: 'P7',
    title: 'Müşteri Vitrini, Favoriler & Ev Satma Talebi',
    scope: 'Girişsiz ilan gezme, üye müşteriye özel favoriler ve emlakçı seçme',
    status: 'Planlandı',
    commit: 'feat(P7): musteri vitrini girissiz ilan gezme favoriler ve emlakci secerek mulk satma talebi',
  },
  {
    code: 'P8',
    title: 'Randevu & Takvim Yönetimi (Saat Kapatma & 6 Saat Kuralı)',
    scope: 'Google Calendar görünümü, manuel saat bloklama, son 6 saat iptal engeli',
    status: 'Planlandı',
    commit: 'feat(P8): takvim ve randevu yonetimi manuel saat kapatma 6 saat iptal kurali ve gecmis notlar',
  },
  {
    code: 'P9',
    title: 'Raporlama, Pytest Test Paketi & Analist DB Dokümanı',
    scope: 'Satış/Kiralama/Randevu grafikleri + Pytest + Otomatik ERD/Veri Sözlüğü',
    status: 'Planlandı',
    commit: 'feat(P9): raporlama ekrani pytest is kurallari test paketi ve analist veritabani dokumani',
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
    module: 'Emlak Arama & Çıktı',
    rule: 'Müşteri talebine uygun emlak bulunduğunda ofis logolu kurumsal yazıcı/PDF çıktısı üretilir.',
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
    rule: 'Ziyaretçiler tüm ilanları görebilir; AI Doğal Dil Arama, Favoriler ve Randevu için müşteri girişi şarttır.',
  },
];

const NAV_ITEMS = [
  { id: 'overview', label: 'Mimari & Yol Haritası (P0)', piece: 'P0' },
  { id: 'agency', label: '1. İşyeri Tanımı & TTBS', piece: 'P2' },
  { id: 'customers', label: '2. Müşteri Yönetimi', piece: 'P3' },
  { id: 'properties', label: '3. Portföy (Emlak) Tanımı', piece: 'P4' },
  { id: 'search', label: '4. Emlak Arama & PDF Çıktı', piece: 'P5' },
  { id: 'ai-match', label: 'AI Akıllı Eşleştirme', piece: 'P6' },
  { id: 'calendar', label: 'Randevu & Takvim', piece: 'P8' },
  { id: 'reports', label: 'Performans Raporları', piece: 'P9' },
] as const;

export default function App() {
  const [selectedNav, setSelectedNav] = useState<string>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const checkBackendHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    void checkBackendHealth();
  }, []);

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
      header: 'Kapsam & Bağlam',
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
      header: 'Zorunlu İş Kuralı (Kod + Analiz Dokümanı Ortak)',
    },
  ];

  const activeNavObj =
    NAV_ITEMS.find((item) => item.id === selectedNav) ?? NAV_ITEMS[0];

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
              label="Ortak İlan Vitrini & AI Arama"
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
                <HStack gap={1.5} vAlign="center">
                  <Token label="PARÇA P0 AKTİF" color="green" />
                  <Token label="React 19 + Astryx Neutral" color="blue" />
                  <Token label="FastAPI + PostgreSQL 16" color="teal" />
                </HStack>
                <Heading level={1}>
                  GİB e-Emlak — Kurumsal Taşınmaz ve Emlak İşletmesi Platformu
                </Heading>
                <Text color="secondary">
                  Gelir İdaresi Başkanlığı İş Analisti Case Çalışması kapsamında
                  parça parça (P0–P9) geliştirilen tam izlenebilir MVP ve
                  akıllı emlak platformu.
                </Text>
              </VStack>

              <HStack gap={1.5}>
                <Button
                  label="Backend & DB Bağlantısını Test Et"
                  variant="primary"
                  isLoading={isCheckingHealth}
                  onClick={() => void checkBackendHealth()}
                />
              </HStack>
            </HStack>
          </Section>

          {health ? (
            <Banner
              status={health.database.connected ? 'success' : 'info'}
              title={
                health.database.connected
                  ? 'FastAPI Backend ve PostgreSQL 16 Veritabanı Bağlantısı Aktif'
                  : 'FastAPI Backend Çalışıyor — PostgreSQL Konteyneri Bekleniyor'
              }
              description={`${health.database.engine} · ${health.database.info}`}
              collapsible={false}
            />
          ) : (
            <Banner
              status="warning"
              title="FastAPI Backend Henüz Başlatılmadı (http://localhost:8000)"
              description="Backend sunucusunu başlatmak için terminalde: cd backend && uvicorn app.main:app --reload --port 8000"
              collapsible={false}
            />
          )}

          {selectedNav !== 'overview' ? (
            <Section padding={4}>
              <VStack gap={2}>
                <HStack gap={1.5} vAlign="center">
                  <Token label={activeNavObj.piece} color="orange" />
                  <Heading level={2}>{activeNavObj.label}</Heading>
                </HStack>
                <Text color="secondary">
                  Bu ekran modülü planlanan geliştirme sırasına göre{' '}
                  {activeNavObj.piece} parçasında aktif edilecektir. Bağlam
                  kopmaması için tüm tablo ve iş kuralı tanımları AI_CONTEXT.md
                  içerisinde hazırdır.
                </Text>
                <HStack>
                  <Button
                    label="Mimari & P0-P9 Yol Haritasına Dön"
                    variant="secondary"
                    onClick={() => setSelectedNav('overview')}
                  />
                </HStack>
              </VStack>
            </Section>
          ) : (
            <VStack gap={4}>
              <Grid columns={{ minWidth: 260, max: 4 }} gap={3}>
                <Card padding={4}>
                  <VStack gap={1}>
                    <Token label="GİB Madde 1" color="blue" />
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
                    <Token label="GİB Madde 2" color="teal" />
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
                    <Token label="GİB Madde 3" color="purple" />
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
                    <Token label="GİB Madde 4" color="green" />
                    <Heading level={3}>4. Arama, AI & PDF Çıktı</Heading>
                    <Text color="secondary" size="sm">
                      Alıcı/Kiracı müşteri taleplerine ve AI doğal dil
                      tasvirine göre eşleştirme + kurumsal A4 yazıcı/PDF bilgi
                      fişi çıktısı.
                    </Text>
                  </VStack>
                </Card>
              </Grid>

              <Section padding={4}>
                <VStack gap={3}>
                  <VStack gap={0.5}>
                    <Heading level={2}>
                      Parça Parça Geliştirme Planı (P0 – P9) ve Commit Standardı
                    </Heading>
                    <Text color="secondary" size="sm">
                      Gökhan ve Güven her parçayı sırayla tamamlayıp tabloda
                      belirtilen standart commit mesajıyla main dalına pushlar.
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
                    <Heading level={2}>
                      Çekirdek İş Kuralları (Kod & Analiz Raporu Ortak Omurgası)
                    </Heading>
                    <Text color="secondary" size="sm">
                      2 Yazılımcı ve 2 İş Analistinin birebir aynı kurallarla
                      ilerlemesi için tanımlanan zorunlu iş kuralları.
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
          )}
        </VStack>
      </Layout>
    </AppShell>
  );
}
