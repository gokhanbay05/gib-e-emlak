import React, { useState } from 'react';
import {
  BedDouble,
  Building2,
  Calendar,
  Heart,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
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
import { Avatar, Button } from '../core';
import '../../css/property/PropertyCards.css';

export interface PropertyCardProps {
  property: PropertyRecord;
  isFavorited: boolean;
  hideCustomerActions?: boolean;
  onSelect: (property: PropertyRecord) => void;
  onToggleFavorite: (propertyId: number) => void;
  onSelectAgency?: (agencyId: number, advisorId?: number) => void;
  onRequestAppointment?: (property: PropertyRecord) => void;
}

/**
 * Hepsiemlak Screenshot #2 imza yatay ilan kartı.
 * Fotoğraf üstü favori kalbi, tam okunaklı başlık, ikonlu özellik şeridi,
 * alt kısımda Emlak Ofisi logosu ve "Telefonu Göster" / "Randevu Al" aksiyonları içerir.
 */
export function PropertyHorizontalCard({
  property,
  isFavorited,
  hideCustomerActions = false,
  onSelect,
  onToggleFavorite,
  onSelectAgency,
  onRequestAppointment,
}: PropertyCardProps) {
  const [showPhone, setShowPhone] = useState(false);
  const gallery = getPropertyGallery(property);
  const advisor = getPropertyAdvisor(property);
  const agencyName =
    property.agency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.';
  const phoneDisplay =
    property.agency?.phone || advisor.phone || '0 (312) 468 10 20';

  return (
    <article className="prop-h-card">
      <div className="prop-h-media" onClick={() => onSelect(property)}>
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

        <span className="prop-photo-count-pill">1/{gallery.length} Fotoğraf</span>
      </div>

      <div className="prop-h-body">
        <div>
          <div className="prop-h-top-row">
            <span className="prop-h-price">{formatPriceTL(property.price)}</span>
            <span className="prop-h-date">
              {formatDateTR(property.created_at)}
            </span>
          </div>

          <h3 className="prop-h-title" onClick={() => onSelect(property)}>
            {property.title}
          </h3>

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
                  <span>{(property.id % 8) + 1} Yaşında</span>
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
              <div className="prop-h-agency-name">{agencyName}</div>
              <div className="prop-h-advisor-sub">
                Danışman: {advisor.full_name}
              </div>
            </div>
          </button>

          <div className="prop-h-actions">
            <Button
              variant="primary"
              size="sm"
              pill
              leftIcon={<Phone size={13} />}
              onClick={() => setShowPhone((v) => !v)}
            >
              {showPhone ? phoneDisplay : 'Telefonu Göster'}
            </Button>

            {!hideCustomerActions && onRequestAppointment && (
              <Button
                variant="outline"
                size="sm"
                pill
                leftIcon={<Calendar size={13} />}
                onClick={() => onRequestAppointment(property)}
              >
                Randevu Al
              </Button>
            )}

            <Button
              variant="whatsapp"
              size="sm"
              pill
              leftIcon={<MessageCircle size={13} />}
              onClick={() => onSelect(property)}
            >
              İncele
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PropertyHorizontalCard;
