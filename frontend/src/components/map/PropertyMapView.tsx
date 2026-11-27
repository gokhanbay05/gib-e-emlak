import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
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
  onSelectProperty: (property: PropertyRecord) => void;
  onToggleFavorite: (propertyId: number) => void;
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

/** Web Mercator dönüşümleri (lat/lng <-> dünya piksel koordinatı) */
function lngToWorldX(lng: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  return ((lng + 180) / 360) * scale;
}

function latToWorldY(lat: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  const clamped = Math.max(-85, Math.min(85, lat));
  const rad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale
  );
}

function worldXToLng(wx: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  return (wx / scale) * 360 - 180;
}

function worldYToLat(wy: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  const n = Math.PI - (2 * Math.PI * wy) / scale;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

interface MapClusterNode {
  id: string;
  screenX: number;
  screenY: number;
  lat: number;
  lng: number;
  items: PropertyRecord[];
}

/**
 * Hepsiemlak Screenshot #4 & GeoSocial tarzı gerçek interaktif Slippy-Tile Harita.
 * Fare ile sürükleme (pan), tekerlek ile yakınlaştırma (zoom),
 * görünür alan (viewport bounds) filtreleme ve kırmızı çerçeveli yuvarlak Cluster balonları içerir.
 */
export function PropertyMapView({
  properties,
  favoriteIds,
  hideCustomerActions = false,
  onSelectProperty,
  onToggleFavorite,
}: PropertyMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 960, height: 640 });
  const [center, setCenter] = useState({ lat: 39.25, lng: 31.2 });
  const [zoom, setZoom] = useState(6);
  const [activeProperty, setActiveProperty] = useState<PropertyRecord | null>(
    null,
  );

  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startCenterWX: number;
    startCenterWY: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewport({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const centerWX = lngToWorldX(center.lng, zoom);
  const centerWY = latToWorldY(center.lat, zoom);

  // Görünür harita karolarını (256x256 CartoDB Voyager / OSM) hesapla
  const tiles = useMemo(() => {
    const maxTile = Math.pow(2, zoom);
    const minWX = centerWX - viewport.width / 2;
    const maxWX = centerWX + viewport.width / 2;
    const minWY = centerWY - viewport.height / 2;
    const maxWY = centerWY + viewport.height / 2;

    const startTX = Math.floor(minWX / 256);
    const endTX = Math.floor(maxWX / 256);
    const startTY = Math.max(0, Math.floor(minWY / 256));
    const endTY = Math.min(maxTile - 1, Math.floor(maxWY / 256));

    const list: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
    }> = [];

    for (let tx = startTX; tx <= endTX; tx++) {
      for (let ty = startTY; ty <= endTY; ty++) {
        const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
        const left = tx * 256 - minWX;
        const top = ty * 256 - minWY;
        const sub = ['a', 'b', 'c'][Math.abs(tx + ty) % 3];
        list.push({
          key: `${zoom}-${tx}-${ty}`,
          url: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrappedX}/${ty}.png`,
          left,
          top,
        });
      }
    }
    return list;
  }, [centerWX, centerWY, viewport.width, viewport.height, zoom]);

  // Görünür koordinat sınırları (Viewport Bounds) içindeki ilanları ve Cluster balonlarını hesapla
  const { clusters, visibleCount } = useMemo(() => {
    const minWX = centerWX - viewport.width / 2;
    const minWY = centerWY - viewport.height / 2;

    const projected: Array<{
      property: PropertyRecord;
      lat: number;
      lng: number;
      sx: number;
      sy: number;
    }> = [];

    for (const p of properties) {
      const coords = getPropertyCoords(p);
      const sx = lngToWorldX(coords.lng, zoom) - minWX;
      const sy = latToWorldY(coords.lat, zoom) - minWY;
      if (
        sx >= -40 &&
        sx <= viewport.width + 40 &&
        sy >= -40 &&
        sy <= viewport.height + 40
      ) {
        projected.push({
          property: p,
          lat: coords.lat,
          lng: coords.lng,
          sx,
          sy,
        });
      }
    }

    // GeoSocial / Supercluster tarzı piksel mesafeli kümeleme
    const clusterRadius = zoom >= 14 ? 0 : zoom >= 11 ? 46 : 72;
    const nodes: MapClusterNode[] = [];

    for (const pt of projected) {
      let merged = false;
      if (clusterRadius > 0) {
        for (const node of nodes) {
          const dx = node.screenX - pt.sx;
          const dy = node.screenY - pt.sy;
          if (Math.hypot(dx, dy) <= clusterRadius) {
            const count = node.items.length;
            node.screenX = (node.screenX * count + pt.sx) / (count + 1);
            node.screenY = (node.screenY * count + pt.sy) / (count + 1);
            node.lat = (node.lat * count + pt.lat) / (count + 1);
            node.lng = (node.lng * count + pt.lng) / (count + 1);
            node.items.push(pt.property);
            merged = true;
            break;
          }
        }
      }
      if (!merged) {
        nodes.push({
          id: `node-${pt.property.id}`,
          screenX: pt.sx,
          screenY: pt.sy,
          lat: pt.lat,
          lng: pt.lng,
          items: [pt.property],
        });
      }
    }

    return {
      clusters: nodes,
      visibleCount: projected.length,
    };
  }, [properties, centerWX, centerWY, viewport.width, viewport.height, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startCenterWX: centerWX,
      startCenterWY: centerWY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const st = dragStateRef.current;
    if (!st || !st.dragging) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const nextWX = st.startCenterWX - dx;
    const nextWY = st.startCenterWY - dy;
    setCenter({
      lng: worldXToLng(nextWX, zoom),
      lat: worldYToLat(nextWY, zoom),
    });
  };

  const handleMouseUp = () => {
    dragStateRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => Math.max(5, Math.min(16, z + delta)));
  };

  const resetTurkeyView = () => {
    setCenter({ lat: 39.25, lng: 31.2 });
    setZoom(6);
    setActiveProperty(null);
  };

  return (
    <div
      ref={containerRef}
      className="slippy-map-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Harita Karo Katmanı */}
      <div className="slippy-tile-layer">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            className="slippy-tile-img"
            style={{ left: `${t.left}px`, top: `${t.top}px` }}
            draggable={false}
          />
        ))}
      </div>

      {/* Sol Üst Görünür Bölge Bilgi Hapı */}
      <div className="slippy-bounds-pill">
        <MapPin size={15} color="var(--color-primary)" />
        <span>
          Harita alanında <strong>{visibleCount}</strong> gayrimenkul görüntüleniyor
        </span>
      </div>

      {/* Sağ Üst Zoom Kontrolleri */}
      <div className="slippy-map-controls">
        <button
          type="button"
          className="slippy-ctrl-btn"
          onClick={() => setZoom((z) => Math.min(16, z + 1))}
          title="Yakınlaştır"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="slippy-ctrl-btn"
          onClick={() => setZoom((z) => Math.max(5, z - 1))}
          title="Uzaklaştır"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="slippy-ctrl-btn"
          onClick={resetTurkeyView}
          title="Tüm Türkiye Görünümü"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Cluster Balonları ve Tekil Fiyat Pinleri */}
      {clusters.map((node) => {
        const count = node.items.length;
        if (count > 1 || zoom <= 8) {
          const sizePx = count >= 10 ? 54 : count >= 4 ? 46 : 40;
          return (
            <button
              key={node.id}
              type="button"
              className="hepsi-cluster-marker"
              style={{
                left: `${node.screenX}px`,
                top: `${node.screenY}px`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                fontSize: count >= 10 ? '14px' : '13px',
              }}
              onClick={() => {
                if (count === 1 && zoom >= 11) {
                  setActiveProperty(node.items[0]);
                } else {
                  setCenter({ lat: node.lat, lng: node.lng });
                  setZoom((z) => Math.min(15, z + 3));
                }
              }}
              title={`${count} İlan — Yakınlaştırmak için tıklayın`}
            >
              {count}
            </button>
          );
        }

        const prop = node.items[0];
        const isSelected = activeProperty?.id === prop.id;
        return (
          <button
            key={`pin-${prop.id}`}
            type="button"
            className={cn('hepsi-price-pin', isSelected && 'is-active')}
            style={{
              left: `${node.screenX}px`,
              top: `${node.screenY}px`,
            }}
            onClick={() => setActiveProperty(prop)}
          >
            {formatCompactPriceTRY(prop.price)}
          </button>
        );
      })}

      {/* Seçili İlan Önizleme Kartı */}
      {activeProperty && (
        <div className="slippy-preview-card">
          <div style={{ position: 'relative', height: '165px' }}>
            <img
              src={getPropertyGallery(activeProperty)[0]}
              alt={activeProperty.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              type="button"
              className="prop-fav-overlay-btn"
              style={{ right: '46px' }}
              onClick={() => onToggleFavorite(activeProperty.id)}
              hidden={hideCustomerActions}
            >
              <Heart
                size={15}
                fill={
                  favoriteIds.has(activeProperty.id) ? 'currentColor' : 'none'
                }
              />
            </button>
            <button
              type="button"
              className="prop-fav-overlay-btn"
              onClick={() => setActiveProperty(null)}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
            <span className="prop-photo-count-pill">
              {formatListingTypeLabel(activeProperty.listing_type)} •{' '}
              {formatPropertyTypeLabel(activeProperty.property_type)}
            </span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatPriceTL(activeProperty.price)}
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.35 }}>
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
