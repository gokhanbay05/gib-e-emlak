import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Typeahead, type SearchSource, type SearchableItem } from '@astryxdesign/core/Typeahead';

export interface LocationOption {
  id: number;
  name: string;
}

interface LocationSearchItem extends SearchableItem {
  id: string;
  label: string;
  numericId: number;
}

/**
 * Türkçe harf duyarsız arama normalleştiricisi:
 * "İstanbul" -> "istanbul", "İzmir" -> "izmir", "Çankaya" -> "cankaya", "Şanlıurfa" -> "sanliurfa"
 */
export function normalizeTurkish(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function buildTurkishSearchSource(
  items: LocationOption[],
): SearchSource<LocationSearchItem> {
  const mapped: LocationSearchItem[] = items.map((item) => ({
    id: String(item.id),
    label: item.name,
    numericId: item.id,
  }));

  return {
    bootstrap: () => mapped,
    search: (query: string) => {
      const normalizedQuery = normalizeTurkish(query.trim());
      if (!normalizedQuery) return mapped;
      return mapped.filter((item) =>
        normalizeTurkish(item.label).includes(normalizedQuery),
      );
    },
  };
}

interface TurkishLocationPickerProps {
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
  isRequired?: boolean;
}

export function TurkishLocationPicker({
  city,
  district,
  neighborhood,
  onChange,
  errors,
  isRequired = true,
}: TurkishLocationPickerProps) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  // 1. 81 İli Türkçe alfabetik sırayla yükle
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/locations/provinces');
        if (res.ok && active) {
          const data = (await res.json()) as { provinces: LocationOption[] };
          setProvinces(data.provinces);
        }
      } catch {
        // fallback handled by backend
      }
    })();
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

  // 2. İl seçilince o ilin ilçelerini yükle
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/locations/districts?province_id=${selectedProvince.id}`,
        );
        if (res.ok && active) {
          const data = (await res.json()) as { districts: LocationOption[] };
          setDistricts(data.districts);
        }
      } catch {
        // ignore
      }
    })();
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

  // 3. İlçe seçilince o ilçenin mahallelerini yükle
  useEffect(() => {
    if (!selectedDistrict) {
      setNeighborhoods([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/locations/neighborhoods?district_id=${selectedDistrict.id}`,
        );
        if (res.ok && active) {
          const data = (await res.json()) as {
            neighborhoods: LocationOption[];
          };
          setNeighborhoods(data.neighborhoods);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedDistrict]);

  const selectedNeighborhoodObj = useMemo(() => {
    if (!neighborhood) return null;
    const found = neighborhoods.find(
      (n) => normalizeTurkish(n.name) === normalizeTurkish(neighborhood),
    );
    if (found) {
      return { id: String(found.id), label: found.name, numericId: found.id };
    }
    return { id: neighborhood, label: neighborhood, numericId: 0 };
  }, [neighborhoods, neighborhood]);

  const provinceSource = useMemo(
    () => buildTurkishSearchSource(provinces),
    [provinces],
  );
  const districtSource = useMemo(
    () => buildTurkishSearchSource(districts),
    [districts],
  );
  const neighborhoodSource = useMemo(
    () => buildTurkishSearchSource(neighborhoods),
    [neighborhoods],
  );

  const selectedProvinceItem: LocationSearchItem | null = selectedProvince
    ? {
        id: String(selectedProvince.id),
        label: selectedProvince.name,
        numericId: selectedProvince.id,
      }
    : city
      ? { id: city, label: city, numericId: 0 }
      : null;

  const selectedDistrictItem: LocationSearchItem | null = selectedDistrict
    ? {
        id: String(selectedDistrict.id),
        label: selectedDistrict.name,
        numericId: selectedDistrict.id,
      }
    : district
      ? { id: district, label: district, numericId: 0 }
      : null;

  return (
    <Grid columns={{ minWidth: 160, max: 3 }} gap={2}>
      <Typeahead<LocationSearchItem>
        label="İl"
        placeholder="İl ara veya seç (Örn: İstanbul, İzmir)"
        searchSource={provinceSource}
        value={selectedProvinceItem}
        onChange={(item) => {
          onChange({
            city: item?.label ?? '',
            district: '',
            neighborhood: '',
          });
        }}
        hasEntriesOnFocus
        minQueryLength={0}
        debounceMs={0}
        maxMenuItems={85}
        emptySearchText="Eşleşen il bulunamadı"
        status={
          errors?.city ? { type: 'error', message: errors.city } : undefined
        }
        isRequired={isRequired}
      />

      <Typeahead<LocationSearchItem>
        label="İlçe"
        placeholder={city ? 'İlçe ara veya seç...' : 'Önce il seçiniz'}
        searchSource={districtSource}
        value={selectedDistrictItem}
        isDisabled={!city}
        disabledMessage="İlçe seçebilmek için önce İl seçiniz."
        onChange={(item) => {
          onChange({
            city,
            district: item?.label ?? '',
            neighborhood: '',
          });
        }}
        hasEntriesOnFocus
        minQueryLength={0}
        debounceMs={0}
        maxMenuItems={85}
        emptySearchText="Eşleşen ilçe bulunamadı"
        status={
          errors?.district
            ? { type: 'error', message: errors.district }
            : undefined
        }
        isRequired={isRequired}
      />

      <Typeahead<LocationSearchItem>
        label="Mahalle"
        placeholder={
          district ? 'Mahalle ara veya seç...' : 'Önce ilçe seçiniz'
        }
        searchSource={neighborhoodSource}
        value={selectedNeighborhoodObj}
        isDisabled={!district}
        disabledMessage="Mahalle seçebilmek için önce İlçe seçiniz."
        onChange={(item) => {
          onChange({
            city,
            district,
            neighborhood: item?.label ?? '',
          });
        }}
        hasEntriesOnFocus
        minQueryLength={0}
        debounceMs={0}
        maxMenuItems={100}
        emptySearchText="Eşleşen mahalle bulunamadı"
        status={
          errors?.neighborhood
            ? { type: 'error', message: errors.neighborhood }
            : undefined
        }
        isRequired={isRequired}
      />
    </Grid>
  );
}
