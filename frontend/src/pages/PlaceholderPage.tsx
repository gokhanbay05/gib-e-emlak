import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { PageHeader } from '../components/common/PageHeader';
import type { NavDestination } from '../types';

interface PlaceholderPageProps {
  title: string;
  description: string;
  onNavigate: (dest: NavDestination) => void;
}

/**
 * Sıradaki geliştirme parçalarında aktif edilecek modüller için sade bilgi sayfası.
 */
export function PlaceholderPage({
  title,
  description,
  onNavigate,
}: PlaceholderPageProps) {
  return (
    <VStack gap={4}>
      <PageHeader title={title} subtitle={description} />
      <Section padding={3}>
        <VStack gap={3}>
          <Text color="secondary">
            Bu modül bir sonraki geliştirme adımında eklenecektir. Şu an İşyeri
            Tanımı ve Hesap/Kayıt ekranlarını kullanabilirsiniz.
          </Text>
          <HStack gap={1.5} wrap="wrap">
            <Button
              label="İşyeri Tanımına Git"
              variant="primary"
              size="sm"
              onClick={() => onNavigate('agency')}
            />
            <Button
              label="Giriş / Kayıt Ekranı"
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('auth')}
            />
          </HStack>
        </VStack>
      </Section>
    </VStack>
  );
}
