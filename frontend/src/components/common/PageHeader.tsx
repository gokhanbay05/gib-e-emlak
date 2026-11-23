import type { ReactNode } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Tüm sayfalarda tutarlı, sade ve mobil uyumlu üst başlık bileşeni.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
      <VStack gap={0.5}>
        <Heading level={2}>{title}</Heading>
        {subtitle && <Text color="secondary">{subtitle}</Text>}
      </VStack>
      {action && <HStack gap={1.5}>{action}</HStack>}
    </HStack>
  );
}
