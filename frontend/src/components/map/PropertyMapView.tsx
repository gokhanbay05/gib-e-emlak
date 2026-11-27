import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import useSupercluster from 'use-supercluster';
import {
  Globe,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { PropertyRecord } from '../../types';
import {
  cn,
  formatCompactPriceTRY,
  formatPriceTL,
  getPropertyGallery,
} from '../../lib/utils';
import {
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../../utils/formatters';
import { Button } from '../core';
import '../../css/map/Map.css';

export interface PropertyMapViewProps {
  properties: PropertyRecord[];
  favoriteIds: Set<number>;
  hideCustomerActions?: boolean;
  initialFocusSingle?: boolean;
  onSelectProperty: (property: PropertyRecord) => void;
  onToggleFavorite: (propertyId: number) => void;
  onOpenMobileFilter?: () => void;
  onExitMap?: () => void;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Ankara: { lat: 39.9208, lng: 32.8541 },
  İstanbul: { lat: 41.0082, lng: 28.9784 },
  İzmir: { lat: 38.4237, lng: 27.1428 },
  Antalya: { lat: 36.8841, lng: 30.7056 },
};

function getPropertyCoords(p: PropertyRecord): { lat: number; lng: number } {
  if (
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    !Number.isNaN(p.latitude) &&
    !Number.isNaN(p.longitude)
  ) {
    return { lat: p.latitude, lng: p.longitude };
  }
  const base = CITY_COORDS[p.city] ?? CITY_COORDS.Ankara;
  const offsetLat = ((p.id * 17) % 100 - 50) * 0.0018;
  const offsetLng = ((p.id * 31) % 100 - 50) * 0.0022;
  return { lat: base.lat + offsetLat, lng: base.lng + offsetLng };
}

// API Key varsa GeoSocial'daki gibi MapTiler vektör stili kullanılır; yoksa güvenilir Raster OpenStreetMap/CARTO stili yüklenir
const MAPTILER_KEY = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env?.VITE_MAPTILER_KEY?.trim();

const FALLBACK_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-carto': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'osm-carto-layer',
      type: 'raster',
      source: 'osm-carto',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const FALLBACK_SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const MAP_VIEWPORT_STORAGE_KEY = 'gib_emlak_map_viewport_v1';
const MAP_STYLE_STORAGE_KEY = 'gib_emlak_map_style_v1';

interface SavedMapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

function readSavedViewport(): SavedMapViewport | null {
  try {
    const raw = sessionStorage.getItem(MAP_VIEWPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMapViewport;
    if (
      typeof parsed.longitude === 'number' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Madde 6: GeoSocial projesindeki MapLibre GL + react-map-gl + use-supercluster
 * mimarisiyle birebir kurulan 60 FPS WebGL akıcı harita (Zoom/konum korumalı + Sokak/Uydu geçişli).
 */
export function PropertyMapView({
  properties,
  favoriteIds,
  hideCustomerActions = false,
  initialFocusSingle = false,
  onSelectProperty,
  onToggleFavorite,
  onOpenMobileFilter,
  onExitMap,
}: PropertyMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const savedViewport = useMemo(
    () => (initialFocusSingle ? null : readSavedViewport()),
    [initialFocusSingle],
  );
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState(
    initialFocusSingle ? 15 : savedViewport?.zoom ?? 5.6,
  );
  const [activeProperty, setActiveProperty] = useState<PropertyRecord | null>(
    null,
  );
  const [mapStyleMode, setMapStyleMode] = useState<'streets' | 'hybrid'>(() => {
    const saved = localStorage.getItem(MAP_STYLE_STORAGE_KEY);
    return saved === 'hybrid' ? 'hybrid' : 'streets';
  });
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    localStorage.setItem(MAP_STYLE_STORAGE_KEY, mapStyleMode);
  }, [mapStyleMode]);

  useEffect(() => {
    const syncTheme = () =>
      setIsDarkTheme(document.documentElement.classList.contains('dark'));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const singleCoords =
    initialFocusSingle && properties[0]
      ? getPropertyCoords(properties[0])
      : null;

  const initialView = useMemo(
    () => ({
      longitude: singleCoords
        ? singleCoords.lng
        : savedViewport?.longitude ?? 31.8,
      latitude: singleCoords
        ? singleCoords.lat
        : savedViewport?.latitude ?? 39.2,
      zoom: initialFocusSingle ? 15 : savedViewport?.zoom ?? 5.6,
    }),
    [initialFocusSingle, singleCoords?.lat, singleCoords?.lng, savedViewport],
  );

  const points = useMemo(
    () =>
      properties.map((p) => {
        const coords = getPropertyCoords(p);
        return {
          type: 'Feature' as const,
          properties: {
            cluster: false,
            propertyId: p.id,
            property: p,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [coords.lng, coords.lat],
          },
        };
      }),
    [properties],
  );

  const updateMapViewport = useCallback(
    (persist = false) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      const currentZoom = map.getZoom();
      setZoom(currentZoom);
      if (persist && !initialFocusSingle) {
        const center = map.getCenter();
        try {
          sessionStorage.setItem(
            MAP_VIEWPORT_STORAGE_KEY,
            JSON.stringify({
              longitude: center.lng,
              latitude: center.lat,
              zoom: currentZoom,
            }),
          );
        } catch {
          // ignore
        }
      }
    },
    [initialFocusSingle],
  );

  useEffect(() => {
    const timer = setTimeout(() => updateMapViewport(false), 120);
    return () => clearTimeout(timer);
  }, [properties.length, updateMapViewport]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds ?? undefined,
    zoom,
    options: { radius: 64, maxZoom: 17 },
  });

  // Görünür alandaki ilan sayısını hesapla
  const visibleCount = useMemo(() => {
    if (!bounds) return properties.length;
    const [w, s, e, n] = bounds;
    return properties.filter((p) => {
      const c = getPropertyCoords(p);
      return c.lng >= w && c.lng <= e && c.lat >= s && c.lat <= n;
    }).length;
  }, [properties, bounds]);

  const handleResetView = () => {
    try {
      sessionStorage.removeItem(MAP_VIEWPORT_STORAGE_KEY);
    } catch {
      // ignore
    }
    mapRef.current?.flyTo({
      center: [31.8, 39.2],
      zoom: 5.6,
      duration: 700,
    });
    setActiveProperty(null);
  };

  const mapStyleSpec: string | StyleSpecification = MAPTILER_KEY
    ? mapStyleMode === 'hybrid'
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
      : isDarkTheme
        ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
        : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
    : mapStyleMode === 'hybrid'
      ? FALLBACK_SATELLITE_STYLE
      : FALLBACK_RASTER_STYLE;

  return (
    <div className="geosocial-map-container">
      <Map
        ref={mapRef}
        initialViewState={initialView}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyleSpec}
        onLoad={() => updateMapViewport(false)}
        onMove={() => updateMapViewport(false)}
        onMoveEnd={() => updateMapViewport(true)}
        onClick={() => setActiveProperty(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const props = cluster.properties as {
            cluster: boolean;
            point_count?: number;
            propertyId?: number;
            property?: PropertyRecord;
          };

          if (props.cluster) {
            const count = props.point_count ?? 2;
            const sizePx = count >= 15 ? 52 : count >= 5 ? 44 : 38;
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="center"
              >
                <button
                  type="button"
                  className="hepsi-cluster-marker"
                  style={{
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    fontSize: count >= 15 ? '14px' : '13px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const expansionZoom = Math.min(
                      supercluster?.getClusterExpansionZoom(
                        Number(cluster.id),
                      ) ?? zoom + 2.5,
                      16,
                    );
                    mapRef.current?.flyTo({
                      center: [longitude, latitude],
                      zoom: expansionZoom,
                      duration: 500,
                    });
                  }}
                  title={`${count} İlan — Yakınlaştırmak için tıklayın`}
                >
                  {count}
                </button>
              </Marker>
            );
          }

          const prop = props.property;
          if (!prop) return null;
          const isSelected = activeProperty?.id === prop.id;

          return (
            <Marker
              key={`prop-${prop.id}`}
              longitude={longitude}
              latitude={latitude}
              anchor="bottom"
            >
              <button
                type="button"
                className={cn('hepsi-price-pin', isSelected && 'is-active')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveProperty(prop);
                  mapRef.current?.flyTo({
                    center: [longitude, latitude],
                    zoom: Math.max(zoom, 12.5),
                    duration: 450,
                  });
                }}
              >
                {formatCompactPriceTRY(prop.price)}
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Sağ Üst Harita / Uydu Görünüm Anahtarı */}
      <div className="map-style-switcher" role="group" aria-label="Harita görünüm stili">
        <button
          type="button"
          className={cn(
            'map-style-switch-btn',
            mapStyleMode === 'streets' && 'is-active',
          )}
          onClick={() => setMapStyleMode('streets')}
          title="Detaylı Sokak & Çevre Haritası"
        >
          <MapIcon size={13} />
          <span>Harita</span>
        </button>
        <button
          type="button"
          className={cn(
            'map-style-switch-btn',
            mapStyleMode === 'hybrid' && 'is-active',
          )}
          onClick={() => setMapStyleMode('hybrid')}
          title="Gerçek Uydu & Karma Görünüm"
        >
          <Globe size={13} />
          <span>Uydu</span>
        </button>
      </div>

      {/* Sol Üst Görünür Bölge Bilgi Hapı */}
      {!initialFocusSingle && (
        <div className="slippy-bounds-pill">
          <MapPin size={15} color="var(--color-primary)" />
          <span>
            Harita alanında <strong>{visibleCount}</strong> gayrimenkul
            görüntüleniyor
          </span>
          <button
            type="button"
            onClick={handleResetView}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '12px',
              padding: '2px 6px',
            }}
            title="Tüm Türkiye Görünümüne Dön"
          >
            <RotateCcw size={13} />
            <span>Sıfırla</span>
          </button>
        </div>
      )}

      {/* Mobilde Alt Orta Hızlı Kontrol Hapı (Detay haritasında da Harita/Uydu anahtarı görünür) */}
      <div className="map-mobile-bottom-bar" role="group" aria-label="Mobil harita kontrolleri">
        <button
          type="button"
          className={cn(
            'map-style-switch-btn',
            mapStyleMode === 'streets' && 'is-active',
          )}
          onClick={() => setMapStyleMode('streets')}
        >
          <MapIcon size={13} />
          <span>Harita</span>
        </button>
        <button
          type="button"
          className={cn(
            'map-style-switch-btn',
            mapStyleMode === 'hybrid' && 'is-active',
          )}
          onClick={() => setMapStyleMode('hybrid')}
        >
          <Globe size={13} />
          <span>Uydu</span>
        </button>
        {!initialFocusSingle && onOpenMobileFilter && (
          <button
            type="button"
            className="map-style-switch-btn"
            onClick={onOpenMobileFilter}
          >
            <SlidersHorizontal size={13} />
            <span>Filtre</span>
          </button>
        )}
        {!initialFocusSingle && onExitMap && (
          <button
            type="button"
            className="map-style-switch-btn"
            onClick={onExitMap}
          >
            <LayoutGrid size={13} />
            <span>Liste</span>
          </button>
        )}
      </div>

      {/* Seçili İlan Önizleme Kartı (Tamamı Tıklanabilir) */}
      {activeProperty && !initialFocusSingle && (
        <div
          className="slippy-preview-card"
          onClick={() => onSelectProperty(activeProperty)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectProperty(activeProperty);
            }
          }}
        >
          <div style={{ position: 'relative', height: '165px' }}>
            <img
              src={getPropertyGallery(activeProperty)[0]}
              alt={activeProperty.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!hideCustomerActions && (
              <button
                type="button"
                className="prop-fav-overlay-btn"
                style={{ right: '46px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(activeProperty.id);
                }}
              >
                <Heart
                  size={15}
                  fill={
                    favoriteIds.has(activeProperty.id) ? 'currentColor' : 'none'
                  }
                />
              </button>
            )}
            <button
              type="button"
              className="prop-fav-overlay-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveProperty(null);
              }}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
            <span className="prop-photo-count-pill">
              {formatListingTypeLabel(activeProperty.listing_type)} •{' '}
              {formatPropertyTypeLabel(activeProperty.property_type)}
            </span>
          </div>

          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--color-primary)',
              }}
            >
              {formatPriceTL(activeProperty.price)}
            </div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                lineHeight: 1.35,
              }}
            >
              {activeProperty.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {activeProperty.room_count} • {activeProperty.gross_sqm} m² •{' '}
              {activeProperty.district} / {activeProperty.city}
            </div>
            <Button
              variant="primary"
              size="sm"
              pill
              fullWidth
              rightIcon={<Maximize2 size={13} />}
              onClick={() => onSelectProperty(activeProperty)}
            >
              İlan Detayına Git
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyMapView;
