import React from 'react';
import {
  BedDouble,
  Building2,
  Heart,
  Layers,
  MapPin,
  Maximize2,
} from 'lucide-react';
import type { PropertyRecord } from '../../types';
import { getPropertyAdvisor } from '../../lib/advisors';
import {
  cn,
  formatPriceTL,
  getPropertyGallery,
} from '../../lib/utils';
import {
  formatDateTR,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../../utils/formatters';
import { Avatar } from '../core';
import '../../css/property/PropertyCards.css';

export interface PropertyCardProps {
  property: PropertyRecord;
  isFavorited: boolean;
  hideCustomerActions?: boolean;
  onSelect: (property: PropertyRecord) => void;
  onToggleFavorite: (propertyId: number) => void;
  onSelectAgency?: (agencyId: number, advisorId?: number) => void;
}

/**
 * Sadeleştirilmiş Yatay İlan Kartı (Madde 7):
 * Gereksiz "Telefonu Göster", "Randevu Al" ve yeşil "İncele" butonları kaldırıldı.
 * Kartın kendisine tıklanınca doğrudan ilan detay sayfasına gider.
 */
export function PropertyHorizontalCard({
  property,
  isFavorited,
  hideCustomerActions = false,
  onSelect,
  onToggleFavorite,
  onSelectAgency,
}: PropertyCardProps) {
  const gallery = getPropertyGallery(property);
  const advisor = getPropertyAdvisor(property);
  const agencyName =
    property.agency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.';
  const age =
    property.building_age !== undefined
      ? property.building_age
      : (property.id % 8) + 1;

  return (
    <article
      className="prop-h-card"
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(property)}
    >
      <div className="prop-h-media">
        <img
          src={gallery[0]}
          alt={property.title}
          className="prop-h-img"
          loading="lazy"
        />

        {!hideCustomerActions && (
          <button
            type="button"
            className={cn(
              'prop-fav-overlay-btn',
              isFavorited && 'is-favorited',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
            title={isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
          >
            <Heart
              size={17}
              fill={isFavorited ? 'currentColor' : 'none'}
              strokeWidth={2.2}
            />
          </button>
        )}
      </div>

      <div className="prop-h-body">
        <div>
          <div className="prop-h-top-row">
            <span className="prop-h-price">{formatPriceTL(property.price)}</span>
            <span className="prop-h-date">
              {formatDateTR(property.created_at)}
            </span>
          </div>

          <h3 className="prop-h-title">{property.title}</h3>

          <div className="prop-h-specs">
            <span className="prop-h-spec-item" style={{ fontWeight: 600 }}>
              {formatListingTypeLabel(property.listing_type)}{' '}
              {formatPropertyTypeLabel(property.property_type)}
            </span>
            <span className="prop-h-spec-item">
              <BedDouble size={14} />
              <span>{property.room_count}</span>
            </span>
            <span className="prop-h-spec-item">
              <Maximize2 size={13} />
              <span>{property.gross_sqm} m²</span>
            </span>
            {property.property_type !== 'ARSA' && (
              <>
                <span className="prop-h-spec-item">
                  <Building2 size={14} />
                  <span>{age === 0 ? 'Sıfır Bina' : `${age} Yaşında`}</span>
                </span>
                <span className="prop-h-spec-item">
                  <Layers size={14} />
                  <span>{property.floor_number}. Kat</span>
                </span>
              </>
            )}
          </div>

          <div className="prop-h-location">
            <MapPin size={13} color="var(--color-primary)" />
            <span>
              {property.city} / {property.district} / {property.neighborhood}
            </span>
          </div>
        </div>

        <div className="prop-h-footer">
          <button
            type="button"
            className="prop-h-agency-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAgency?.(property.agency_id || 1, advisor.id);
            }}
          >
            <Avatar
              src={property.agency?.logo_url}
              name={agencyName}
              size="sm"
              shape="rounded"
            />
            <div>
              <div className="prop-h-agency-name">{agencyName}</div>
              <div className="prop-h-advisor-sub">
                Danışman: {advisor.full_name}
              </div>
            </div>
          </button>

          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
            }}
          >
            İlan No: #{150000 + property.id}
          </span>
        </div>
      </div>
    </article>
  );
}

export default PropertyHorizontalCard;
