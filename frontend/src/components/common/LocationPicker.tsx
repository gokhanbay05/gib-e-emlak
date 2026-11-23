import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { fetchDistricts, fetchNeighborhoods, fetchProvinces } from '../../api/locations';
import type { LocationOption } from '../../types';
import { normalizeTurkish } from '../../utils/formatters';

interface LocationPickerProps {
  city: string;
  district: string;
  neighborhood: string;
  onChange: (next: {
    city: string;
    district: string;
    neighborhood: string;
  }) => void;
  errors?: {
    city?: string;
    district?: string;
    neighborhood?: string;
  };
  requiredMark?: boolean;
}

/**
 * Astryx Selector tabanlı Türkiye İl -> İlçe -> Mahalle seçici.
 * - Seçili değer normal düz metin olarak görünür (pill/chip üretmez).
 * - Label içinde normalize edilmiş anahtar taşır; renderOption/renderValue sadece
 *   gerçek Türkçe adı gösterir. Böylece "istanbul", "izmir", "cankaya" aramaları
 *   eksiksiz çalışır.
 */
export function LocationPicker({
  city,
  district,
  neighborhood,
  onChange,
  errors,
  requiredMark = true,
}: LocationPickerProps) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);

  const star = requiredMark ? ' *' : '';

  // 1. 81 İli Türkçe alfabetik sırayla yükle
  useEffect(() => {
    let active = true;
    void fetchProvinces()
      .then((res) => {
        if (active) setProvinces(res.provinces);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const selectedProvince = useMemo(
    () =>
      provinces.find(
        (p) => normalizeTurkish(p.name) === normalizeTurkish(city),
      ) ?? null,
    [provinces, city],
  );

  // 2. Seçili ile ait ilçeleri yükle
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      return;
    }
    let active = true;
    setIsLoadingDistricts(true);
    void fetchDistricts(selectedProvince.id)
      .then((res) => {
        if (active) setDistricts(res.districts);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingDistricts(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProvince]);

  const selectedDistrict = useMemo(
    () =>
      districts.find(
        (d) => normalizeTurkish(d.name) === normalizeTurkish(district),
      ) ?? null,
    [districts, district],
  );

  // 3. Seçili ilçeye ait mahalleleri yükle
  useEffect(() => {
    if (!selectedDistrict) {
      setNeighborhoods([]);
      return;
    }
    let active = true;
    setIsLoadingNeighborhoods(true);
    void fetchNeighborhoods(selectedDistrict.id)
      .then((res) => {
        if (active) setNeighborhoods(res.neighborhoods);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingNeighborhoods(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDistrict]);

  const toSelectorOptions = (items: LocationOption[]) =>
    items.map((item) => ({
      value: item.name,
      label: `${item.name} ${normalizeTurkish(item.name)}`,
    }));

  const provinceOptions = useMemo(() => toSelectorOptions(provinces), [provinces]);
  const districtOptions = useMemo(() => toSelectorOptions(districts), [districts]);
  const neighborhoodOptions = useMemo(
    () => toSelectorOptions(neighborhoods),
    [neighborhoods],
  );

  return (
    <VStack gap={2}>
      <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
        <Selector
          label={`İl${star}`}
          placeholder="İl seçiniz"
          hasSearch
          hasClear
          searchPlaceholder="İl ara (Örn: İstanbul, İzmir)"
          emptySearchText="Eşleşen il bulunamadı"
          value={city || null}
          options={provinceOptions}
          renderOption={(opt) => <Text>{opt.value}</Text>}
          renderValue={(opt) => <Text>{opt.value}</Text>}
          onChange={(val) =>
            onChange({
              city: val ?? '',
              district: '',
              neighborhood: '',
            })
          }
          status={errors?.city ? { type: 'error', message: errors.city } : undefined}
          width="100%"
        />

        <Selector
          label={`İlçe${star}`}
          placeholder={city ? 'İlçe seçiniz' : 'Önce il seçin'}
          hasSearch
          hasClear
          searchPlaceholder="İlçe ara..."
          emptySearchText="Eşleşen ilçe bulunamadı"
          isDisabled={!city}
          isLoading={isLoadingDistricts}
          value={district || null}
          options={districtOptions}
          renderOption={(opt) => <Text>{opt.value}</Text>}
          renderValue={(opt) => <Text>{opt.value}</Text>}
          onChange={(val) =>
            onChange({
              city,
              district: val ?? '',
              neighborhood: '',
            })
          }
          status={
            errors?.district ? { type: 'error', message: errors.district } : undefined
          }
          width="100%"
        />
      </Grid>

      <Selector
        label={`Mahalle${star}`}
        placeholder={district ? 'Mahalle seçiniz' : 'Önce ilçe seçin'}
        hasSearch
        hasClear
        searchPlaceholder="Mahalle ara..."
        emptySearchText="Eşleşen mahalle bulunamadı"
        isDisabled={!district}
        isLoading={isLoadingNeighborhoods}
        value={neighborhood || null}
        options={neighborhoodOptions}
        renderOption={(opt) => <Text>{opt.value}</Text>}
        renderValue={(opt) => <Text>{opt.value}</Text>}
        onChange={(val) =>
          onChange({
            city,
            district,
            neighborhood: val ?? '',
          })
        }
        status={
          errors?.neighborhood
            ? { type: 'error', message: errors.neighborhood }
            : undefined
        }
        width="100%"
      />
    </VStack>
  );
}
