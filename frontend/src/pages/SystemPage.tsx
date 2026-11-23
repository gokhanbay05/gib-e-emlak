import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Section } from '@astryxdesign/core/Section';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { PageHeader } from '../components/common/PageHeader';
import type { DbTableSummary, SystemOverview } from '../types';

interface SystemPageProps {
  overview: SystemOverview | null;
}

/**
 * PostgreSQL 8 tablo canlı durumu ve sistem bilgisi ekranı.
 */
export function SystemPage({ overview }: SystemPageProps) {
  const columns: TableColumn<DbTableSummary>[] = [
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
      renderCell: (item) => <Text>{item.row_count}</Text>,
    },
  ];

  return (
    <VStack gap={4}>
      <PageHeader
        title="Sistem ve Veritabanı Özeti"
        subtitle="PostgreSQL 16 ilişkisel tablo kayıt sayıları ve sunucu durumu."
      />

      <Banner
        status={overview?.connected ? 'success' : 'info'}
        title={
          overview?.connected
            ? 'PostgreSQL 16 ve FastAPI bağlantısı aktif'
            : 'Veritabanı bağlantısı bekleniyor'
        }
        description={overview?.info ?? 'PostgreSQL 16 + SQLAlchemy 2.0'}
        collapsible={false}
      />

      <Section padding={3}>
        <VStack gap={2}>
          <Heading level={3}>Veritabanı Tabloları</Heading>
          <Divider />
          <HStack isScrollable width="100%">
            <Table
              data={overview?.tables ?? []}
              columns={columns}
              idKey="table_name"
              hasHover
            />
          </HStack>
        </VStack>
      </Section>
    </VStack>
  );
}
