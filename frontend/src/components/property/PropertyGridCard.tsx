import React from 'react';
import {
  BedDouble,
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
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../../utils/formatters';
import { Avatar } from '../core';
import type { PropertyCardProps } from './PropertyHorizontalCard';
import '../../css/property/PropertyCards.css';

export function PropertyGridCard({
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

  return (
    <article className="prop-grid-card">
      <div className="prop-grid-media" onClick={() => onSelect(property)}>
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
          >
            <Heart
              size={16}
              fill={isFavorited ? 'currentColor' : 'none'}
              strokeWidth={2.2}
            />
          </button>
        )}

        <span className="prop-photo-count-pill">
          {formatListingTypeLabel(property.listing_type)} •{' '}
          {formatPropertyTypeLabel(property.property_type)}
        </span>
      </div>

      <div className="prop-grid-body">
        <div
          className="prop-h-price"
          style={{ fontSize: '19px', color: 'var(--color-primary)' }}
        >
          {formatPriceTL(property.price)}
        </div>

        <h3
          className="prop-h-title"
          style={{ fontSize: '14.5px', margin: 0 }}
          onClick={() => onSelect(property)}
        >
          {property.title}
        </h3>

        <div className="prop-h-specs" style={{ gap: '10px', fontSize: '12.5px' }}>
          <span className="prop-h-spec-item">
            <BedDouble size={13} />
            <span>{property.room_count}</span>
          </span>
          <span className="prop-h-spec-item">
            <Maximize2 size={12} />
            <span>{property.gross_sqm} m²</span>
          </span>
          {property.property_type !== 'ARSA' && (
            <span className="prop-h-spec-item">
              <Layers size={13} />
              <span>{property.floor_number}. Kat</span>
            </span>
          )}
        </div>

        <div className="prop-h-location" style={{ marginTop: 'auto' }}>
          <MapPin size={13} color="var(--color-primary)" />
          <span>
            {property.district} / {property.city} ({property.neighborhood})
          </span>
        </div>

        <div
          className="prop-h-footer"
          style={{ marginTop: '6px', paddingTop: '10px' }}
        >
          <button
            type="button"
            className="prop-h-agency-btn"
            onClick={() =>
              onSelectAgency?.(property.agency_id || 1, advisor.id)
            }
          >
            <Avatar
              src={property.agency?.logo_url}
              name={agencyName}
              size="sm"
              shape="rounded"
            />
            <div>
              <div className="prop-h-agency-name" style={{ fontSize: '12px' }}>
                {agencyName}
              </div>
              <div className="prop-h-advisor-sub">{advisor.full_name}</div>
            </div>
          </button>
        </div>
      </div>
    </article>
  );
}

export default PropertyGridCard;
