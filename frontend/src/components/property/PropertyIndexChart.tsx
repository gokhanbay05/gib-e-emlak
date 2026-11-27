import React, { useState } from 'react';
import type { PropertyRecord } from '../../types';
import {
  buildPropertyDistrictIndex,
  type DistrictIndexSeriesPoint,
} from '../../lib/advisors';
import { formatPriceTL, getPropertyGallery } from '../../lib/utils';
import '../../css/property/PropertyIndexChart.css';

interface SingleTrendChartProps {
  title: string;
  unitLabel: string;
  series: DistrictIndexSeriesPoint[];
  cityName: string;
  districtName: string;
  currentPropertySqmPrice?: number;
}

function SingleTrendChart({
  title,
  unitLabel,
  series,
  cityName,
  districtName,
  currentPropertySqmPrice,
}: SingleTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const allVals = series.flatMap((s) => [s.cityAvg, s.districtAvg]);
  if (currentPropertySqmPrice) allVals.push(currentPropertySqmPrice);

  const minVal = Math.floor(Math.min(...allVals) * 0.92);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.06);
  const range = Math.max(1, maxVal - minVal);

  const width = 760;
  const height = 220;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, series.length - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - ((val - minVal) / range) * plotH;

  const buildPath = (getter: (pt: DistrictIndexSeriesPoint) => number) =>
    series
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(getter(pt)).toFixed(1)}`)
      .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(minVal + t * range),
  );

  return (
    <div className="emlak-chart-card">
      <div className="emlak-chart-header">
        <h4 className="emlak-chart-title">{title}</h4>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          12 Aylık Değişim Grafiği
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Yatay Kılavuz Çizgileri */}
        {yTicks.map((tickVal) => {
          const y = getY(tickVal);
          return (
            <g key={tickVal}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="var(--color-border-default)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-muted)"
              >
                {tickVal >= 1000
                  ? `${Math.round(tickVal / 1000)} Bin ${unitLabel}`
                  : `${tickVal} ${unitLabel}`}
              </text>
            </g>
          );
        })}

        {/* İl Ortalaması Çizgisi (Yeşil) */}
        <path
          d={buildPath((p) => p.cityAvg)}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
        />

        {/* İlçe Ortalaması Çizgisi (Turuncu) */}
        <path
          d={buildPath((p) => p.districtAvg)}
          fill="none"
          stroke="#e86c3a"
          strokeWidth="2.5"
        />

        {/* Noktalar, Etkileşimli Hover Hedefleri ve Ay Etiketleri */}
        {series.map((pt, idx) => {
          const x = getX(idx);
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={pt.month}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="var(--color-primary)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              )}
              <circle
                cx={x}
                cy={getY(pt.cityAvg)}
                r={isHovered ? '6' : '4'}
                fill="var(--color-bg-surface)"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              <circle
                cx={x}
                cy={getY(pt.districtAvg)}
                r={isHovered ? '6' : '4'}
                fill="var(--color-bg-surface)"
                stroke="#e86c3a"
                strokeWidth="2.5"
              />
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={isHovered ? '700' : '400'}
                fill={isHovered ? 'var(--color-primary)' : 'var(--color-text-muted)'}
              >
                {pt.month}
              </text>
              {/* Geniş görünmez hover alanı */}
              <rect
                x={x - plotW / Math.max(2, series.length * 2)}
                y={padTop}
                width={plotW / Math.max(1, series.length)}
                height={plotH + 16}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Bu İlan Kırmızı Noktası */}
        {currentPropertySqmPrice && (
          <circle
            cx={getX(series.length - 1)}
            cy={getY(currentPropertySqmPrice)}
            r="6.5"
            fill="var(--color-primary)"
            stroke="#ffffff"
            strokeWidth="2"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Etkileşimli Tooltip Kartı */}
        {hoveredIdx !== null && series[hoveredIdx] && (() => {
          const pt = series[hoveredIdx];
          const x = getX(hoveredIdx);
          const showListingRow =
            hoveredIdx === series.length - 1 && Boolean(currentPropertySqmPrice);
          const boxW = 196;
          const boxH = showListingRow ? 84 : 66;
          const boxX = Math.min(Math.max(padLeft, x - boxW / 2), width - padRight - boxW);
          const minPointY = Math.min(getY(pt.cityAvg), getY(pt.districtAvg));
          const boxY = Math.max(4, minPointY - boxH - 12);

          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx="10"
                fill="var(--color-bg-surface)"
                stroke="var(--color-border-default)"
                strokeWidth="1.2"
                filter="drop-shadow(0 6px 14px rgba(15, 23, 42, 0.14))"
              />
              <text
                x={boxX + 12}
                y={boxY + 18}
                fontSize="11.5"
                fontWeight="700"
                fill="var(--color-text-primary)"
              >
                {pt.month} Dönemi
              </text>
              <circle cx={boxX + 16} cy={boxY + 34} r="4" fill="#10b981" />
              <text x={boxX + 26} y={boxY + 38} fontSize="11" fill="var(--color-text-secondary)">
                {cityName}: {pt.cityAvg.toLocaleString('tr-TR')} {unitLabel}
              </text>
              <circle cx={boxX + 16} cy={boxY + 52} r="4" fill="#e86c3a" />
              <text x={boxX + 26} y={boxY + 56} fontSize="11" fill="var(--color-text-secondary)">
                {districtName}: {pt.districtAvg.toLocaleString('tr-TR')} {unitLabel}
              </text>
              {showListingRow && currentPropertySqmPrice && (
                <>
                  <circle cx={boxX + 16} cy={boxY + 70} r="4" fill="var(--color-primary)" />
                  <text
                    x={boxX + 26}
                    y={boxY + 74}
                    fontSize="11"
                    fontWeight="700"
                    fill="var(--color-primary)"
                  >
                    Bu İlan: {currentPropertySqmPrice.toLocaleString('tr-TR')} {unitLabel}
                  </text>
                </>
              )}
            </g>
          );
        })()}
      </svg>

      <div className="emlak-chart-legend">
        <span className="emlak-legend-item">
          <span
            className="emlak-legend-dot"
            style={{ backgroundColor: '#10b981' }}
          />
          <span>{cityName}</span>
        </span>
        <span className="emlak-legend-item">
          <span
            className="emlak-legend-dot"
            style={{ backgroundColor: '#e86c3a' }}
          />
          <span>{districtName}</span>
        </span>
        {currentPropertySqmPrice && (
          <span className="emlak-legend-item">
            <span
              className="emlak-legend-dot"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
            <span>Bu İlan ({currentPropertySqmPrice.toLocaleString('tr-TR')} TL/m²)</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Madde 8: Doğrudan PostgreSQL veritabanındaki mevcut ilanlardan beslenen
 * "Bölge Emlak Endeksi" bileşeni.
 */
export function PropertyIndexChart({
  property,
  allProperties = [],
}: {
  property: PropertyRecord;
  allProperties?: PropertyRecord[];
}) {
  const indexData = buildPropertyDistrictIndex(property, allProperties);
  const gallery = getPropertyGallery(property);
  const isSale = property.listing_type === 'SATILIK';

  return (
    <div className="emlak-index-section">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700 }}>
            Bölge Emlak Endeksi (Canlı Veritabanı Analizi)
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            Bu ilanın <strong>{property.district}, {property.city}</strong>{' '}
            bölgesindeki kayıtlı ilanlara göre m² fiyat analizi
          </p>
        </div>
        <span
          style={{
            padding: '5px 12px',
            borderRadius: '999px',
            backgroundColor: 'var(--color-primary-soft)',
            color: 'var(--color-primary)',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          Veritabanı Kaynağı: {property.district} ({indexData.districtPropertyCount} İlan) /{' '}
          {property.city} ({indexData.cityPropertyCount} İlan)
        </span>
      </div>

      {/* Üst Karşılaştırma Kutusu (Bu İlan vs İlçe Ortalamaları) */}
      <div className="emlak-index-compare-box">
        <div className="emlak-index-this-card">
          <img
            src={gallery[0]}
            alt={property.title}
            className="emlak-index-thumb"
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Bu İlan</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {property.room_count} • {property.gross_sqm} m² • {property.floor_number}. Kat
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              {isSale ? 'Satış Fiyatı' : 'Kira Fiyatı'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              {formatPriceTL(property.price)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              m² Fiyatı
            </div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-primary)' }}>
              {indexData.propertySqmPrice.toLocaleString('tr-TR')} TL
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: '14.5px', fontWeight: 700 }}>
            {property.district} İlçesi Emlak Ortalamaları
          </h4>
          <div className="emlak-index-district-grid">
            <div>
              <div className="emlak-index-metric-label">Ortalama Satış Fiyatı</div>
              <div className="emlak-index-metric-val">
                {formatPriceTL(indexData.districtAvgSalePrice)}
              </div>
            </div>
            <div>
              <div className="emlak-index-metric-label">Ortalama Kira Fiyatı</div>
              <div className="emlak-index-metric-val">
                {formatPriceTL(indexData.districtAvgRentPrice)}
              </div>
            </div>
            <div>
              <div className="emlak-index-metric-label">Ortalama m² Fiyatı</div>
              <div className="emlak-index-metric-val">
                {indexData.districtAvgSaleSqm.toLocaleString('tr-TR')} TL
              </div>
            </div>
            <div>
              <div className="emlak-index-metric-label">Kira Geri Dönüş Süresi</div>
              <div className="emlak-index-metric-val">
                {indexData.amortizationYears} Yıl
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Satış Fiyatı / m² Grafiği */}
      <SingleTrendChart
        title="Satış Fiyatı / m²"
        unitLabel="TL"
        series={indexData.saleSeries}
        cityName={property.city}
        districtName={property.district}
        currentPropertySqmPrice={isSale ? indexData.propertySqmPrice : undefined}
      />

      {/* Kiralık Fiyatı / m² Grafiği */}
      <SingleTrendChart
        title="Kiralık Fiyatı / m²"
        unitLabel="TL"
        series={indexData.rentSeries}
        cityName={property.city}
        districtName={property.district}
        currentPropertySqmPrice={!isSale ? indexData.propertySqmPrice : undefined}
      />
    </div>
  );
}

export default PropertyIndexChart;
