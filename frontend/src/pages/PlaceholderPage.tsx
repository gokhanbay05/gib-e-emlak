import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { PageFrame } from '../components/layout/PageFrame';
import type { NavDestination } from '../types';

interface PlaceholderPageProps {
  title: string;
  description: string;
  onNavigate: (dest: NavDestination) => void;
}

/**
 * Henüz geliştirilmemiş modüller (P10-P11) için sade bilgi sayfası.
 */
export function PlaceholderPage({
  title,
  description,
  onNavigate,
}: PlaceholderPageProps) {
  return (
    <PageFrame title={title} subtitle={description}>
      <VStack gap={3}>
        <Text color="secondary">
          Bu modül sıradaki geliştirme adımında eklenecektir.
        </Text>
        <HStack gap={1.5} wrap="wrap">
          <Button
            label="Ana Sayfaya Dön"
            variant="primary"
            size="sm"
            onClick={() => onNavigate('agency')}
          />
        </HStack>
      </VStack>
    </PageFrame>
  );
}
