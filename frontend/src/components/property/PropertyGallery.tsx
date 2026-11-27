import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../core';
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
 * Madde 8: Hem yatay (16:9 / 4:3) hem de dikey (9:16 telefon çekimi) görselleri
 * oranını bozmadan (object-fit: contain + bulanık arka plan) sığdıran fotoğraf galerisi.
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
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const multiTouchRef = useRef(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const lastTapRef = useRef<number>(0);

  const safeIndex = activeIndex < images.length ? activeIndex : 0;

  const resetZoom = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    resetZoom();
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    resetZoom();
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const clampPan = (x: number, y: number, scale: number) => {
    const maxX = Math.max(0, (scale - 1) * 190);
    const maxY = Math.max(0, (scale - 1) * 260);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      multiTouchRef.current = true;
      setIsDragging(false);
      setDragOffset(0);
      touchStartRef.current = null;
      pinchStartDistRef.current = getTouchDist(e.touches);
      pinchStartScaleRef.current = zoomScale;
      return;
    }
    multiTouchRef.current = false;
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    panStartRef.current = { ...pan };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (lightboxOpen && e.touches.length >= 2 && pinchStartDistRef.current) {
      const dist = getTouchDist(e.touches);
      const next = Math.min(
        3.2,
        Math.max(1, pinchStartScaleRef.current * (dist / pinchStartDistRef.current)),
      );
      setZoomScale(next);
      if (next <= 1.02) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((prev) => clampPan(prev.x, prev.y, next));
      }
      return;
    }

    if (multiTouchRef.current || !touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (lightboxOpen && zoomScale > 1.05) {
      setPan(
        clampPan(panStartRef.current.x + dx, panStartRef.current.y + dy, zoomScale),
      );
      return;
    }

    if (Math.abs(dx) > Math.abs(dy) || lightboxOpen) {
      // Sınır dirençli canlı kaydırma (iki resmi yan yana gösterir)
      const atStart = safeIndex === 0 && dx > 0;
      const atEnd = safeIndex === images.length - 1 && dx < 0;
      setDragOffset(atStart || atEnd ? dx * 0.3 : dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length > 0) return;
    setIsDragging(false);

    if (multiTouchRef.current) {
      multiTouchRef.current = false;
      pinchStartDistRef.current = null;
      touchStartRef.current = null;
      setDragOffset(0);
      if (zoomScale <= 1.05) resetZoom();
      return;
    }

    // Çift dokunma ile hızlı zoom (yalnızca lightboxta ve kaydırma yoksa)
    if (lightboxOpen && Math.abs(dragOffset) < 8 && touchStartRef.current) {
      const changed = e.changedTouches[0];
      const moved = changed
        ? Math.hypot(
            changed.clientX - touchStartRef.current.x,
            changed.clientY - touchStartRef.current.y,
          )
        : 99;
      if (moved < 10) {
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          if (zoomScale > 1.05) resetZoom();
          else setZoomScale(2.2);
          lastTapRef.current = 0;
          touchStartRef.current = null;
          setDragOffset(0);
          return;
        }
        lastTapRef.current = now;
      }
    }

    if (zoomScale <= 1.05 && Math.abs(dragOffset) > 50) {
      if (dragOffset < 0 && safeIndex < images.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (dragOffset > 0 && safeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    setDragOffset(0);
    touchStartRef.current = null;
  };

  return (
    <>
      <div className="prop-gallery">
        <div
          className="prop-gallery-stage"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="prop-carousel-track"
            style={{
              transform: `translate3d(calc(-${safeIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {images.map((url, idx) => (
              <div key={`${url}-${idx}`} className="prop-carousel-slide">
                <div
                  className="prop-gallery-backdrop"
                  style={{ backgroundImage: `url("${url}")` }}
                />
                <img
                  src={url}
                  alt={`${title} - Fotoğraf ${idx + 1}`}
                  className="prop-gallery-main-img"
                  draggable={false}
                  onClick={() => {
                    if (Math.abs(dragOffset) < 6) setLightboxOpen(true);
                  }}
                />
              </div>
            ))}
          </div>

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

      {lightboxOpen && (
        <div
          className="prop-lightbox-backdrop"
          onClick={() => {
            setZoomScale(1);
            setLightboxOpen(false);
          }}
        >
          <div
            className="prop-lightbox-topbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              <span className="prop-lightbox-title">{title} • </span>
              <span>{safeIndex + 1} / {images.length}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setZoomScale(1);
                setLightboxOpen(false);
              }}
              aria-label="Kapat"
              style={{
                padding: '6px',
                border: 'none',
                background: 'transparent',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '22px',
                lineHeight: 1,
                fontWeight: 500,
              }}
            >
              ✕
            </button>
          </div>

          <div
            className="prop-lightbox-stage"
            style={{ touchAction: 'none', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={() => {
              if (zoomScale > 1.05) resetZoom();
              else setZoomScale(2.2);
            }}
          >
            {images.length > 1 && (
              <button
                type="button"
                className="prop-lightbox-arrow is-left"
                onClick={handlePrev}
                aria-label="Önceki Fotoğraf"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div
              className="prop-carousel-track"
              style={{
                transform: `translate3d(calc(-${safeIndex * 100}% + ${zoomScale > 1.05 ? 0 : dragOffset}px), 0, 0)`,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {images.map((url, idx) => (
                <div key={`lb-${url}-${idx}`} className="prop-carousel-slide">
                  <img
                    src={url}
                    alt={`${title} - ${idx + 1}`}
                    className="prop-lightbox-img"
                    draggable={false}
                    style={
                      idx === safeIndex
                        ? {
                            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomScale})`,
                            transition: isDragging
                              ? 'none'
                              : 'transform 0.18s ease-out',
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <button
                type="button"
                className="prop-lightbox-arrow is-right"
                onClick={handleNext}
                aria-label="Sonraki Fotoğraf"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          <div
            className="prop-lightbox-footer"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              pill
              leftIcon={<ChevronLeft size={15} />}
              onClick={handlePrev}
            >
              Önceki
            </Button>
            <Button
              variant="primary"
              size="sm"
              pill
              rightIcon={<ChevronRight size={15} />}
              onClick={handleNext}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default PropertyGallery;
