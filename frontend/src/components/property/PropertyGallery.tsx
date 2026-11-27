import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Modal } from '../core';
import '../../css/property/PropertyGallery.css';

export interface PropertyGalleryProps {
  images: string[];
  title: string;
  propertyId: number;
  isFavorited: boolean;
  hideFavorite?: boolean;
  onToggleFavorite: () => void;
}

/**
 * Hepsiemlak Screenshot #6 tarzı 5'li thumbnail şeritli,
 * fotoğraf üstü < > okları, sağ üst favori kalbi, sol alt "Büyük Fotoğraf"
 * ve alt orta sayaç (1/5) içeren interaktif fotoğraf galerisi.
 */
export function PropertyGallery({
  images,
  title,
  propertyId,
  isFavorited,
  hideFavorite = false,
  onToggleFavorite,
}: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeIndex = activeIndex < images.length ? activeIndex : 0;
  const activeUrl = images[safeIndex] ?? images[0];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <>
      <div className="prop-gallery">
        <div className="prop-gallery-stage">
          <img
            src={activeUrl}
            alt={`${title} - Fotoğraf ${safeIndex + 1}`}
            className="prop-gallery-main-img"
            onClick={() => setLightboxOpen(true)}
          />

          <button
            type="button"
            className="prop-gallery-nav-btn is-left"
            onClick={handlePrev}
            aria-label="Önceki Fotoğraf"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            className="prop-gallery-nav-btn is-right"
            onClick={handleNext}
            aria-label="Sonraki Fotoğraf"
          >
            <ChevronRight size={20} />
          </button>

          {!hideFavorite && (
            <button
              type="button"
              className={cn(
                'prop-gallery-fav-btn',
                isFavorited && 'is-favorited',
              )}
              onClick={onToggleFavorite}
              aria-label="Favorilere Ekle"
            >
              <Heart
                size={20}
                fill={isFavorited ? 'currentColor' : 'none'}
                strokeWidth={2.2}
              />
            </button>
          )}

          <button
            type="button"
            className="prop-gallery-zoom-pill"
            onClick={() => setLightboxOpen(true)}
          >
            <Search size={14} />
            <span>Büyük Fotoğraf</span>
          </button>

          <span className="prop-gallery-counter-pill">
            {safeIndex + 1}/{images.length}
          </span>

          <span className="prop-gallery-watermark">
            #{150000 + propertyId}
          </span>
        </div>

        <div className="prop-gallery-thumbs">
          {images.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              className={cn(
                'prop-gallery-thumb-btn',
                idx === safeIndex && 'is-active',
              )}
              onClick={() => setActiveIndex(idx)}
            >
              <img
                src={url}
                alt={`Küçük görsel ${idx + 1}`}
                className="prop-gallery-thumb-img"
              />
            </button>
          ))}
        </div>
      </div>

      <Modal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${title} (${safeIndex + 1} / ${images.length})`}
        size="xl"
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Button
              variant="outline"
              pill
              leftIcon={<ChevronLeft size={16} />}
              onClick={handlePrev}
            >
              Önceki Fotoğraf
            </Button>
            <Button
              variant="primary"
              pill
              rightIcon={<ChevronRight size={16} />}
              onClick={handleNext}
            >
              Sonraki Fotoğraf
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={activeUrl}
            alt={title}
            style={{
              width: '100%',
              maxHeight: '72vh',
              objectFit: 'contain',
              borderRadius: '12px',
            }}
          />
        </div>
      </Modal>
    </>
  );
}

export default PropertyGallery;
