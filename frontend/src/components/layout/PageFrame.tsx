import type { ReactNode } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import {
  Layout,
  LayoutContent,
  LayoutHeader,
} from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface PageFrameProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Uygulama genelindeki tüm sayfaların ortak çerçevesi.
 * Astryx `Layout` + `LayoutHeader` + `LayoutContent` kullanarak başlık,
 * aksiyon butonu ve sayfa içeriğini tek bir dikey hizada tutar.
 */
export function PageFrame({
  title,
  subtitle,
  action,
  children,
}: PageFrameProps) {
  return (
    <Layout
      contentWidth={1040}
      padding={4}
      defaultHasDividers
      header={
        <LayoutHeader>
          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <VStack gap={0.5}>
              <Heading level={2}>{title}</Heading>
              {subtitle && <Text color="secondary">{subtitle}</Text>}
            </VStack>
            {action && <HStack gap={1.5}>{action}</HStack>}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>{children}</VStack>
        </LayoutContent>
      }
    />
  );
}
