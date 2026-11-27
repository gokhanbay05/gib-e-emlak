import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, MapPin, Sparkles, X } from 'lucide-react';
import {
  fetchAiPropertyRecommendations,
  type AiRecommendationItem,
} from '../../api/properties';
import type { PropertyRecord } from '../../types';
import { formatPriceTL, getPropertyGallery } from '../../lib/utils';
import { Badge, Button, Card } from '../core';
import { useBodyScrollLock, useVisualViewport } from '../core/Modal';
import '../../css/modals/AiSearchModal.css';

export interface AiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty: (property: PropertyRecord) => void;
}

const QUICK_AI_SUGGESTIONS = [
  "Kadıköy'de Söğütlüçeşme Marmaray istasyonuna yakın kiralık 2+1",
  "Çankaya'da Kızılay metro istasyonuna yakın kiralık veya satılık 3+1",
  "Karşıyaka veya Çeşme'de denize yakın satılık 3+1 veya villa",
  "Antalya Konyaaltı'nda havuzlu sitede satılık daire",
];

/**
 * Madde 7: Framer Motion ile sağ alttaki AI buton noktasından parıltılı dairesel büyüme
 * (clip-path: circle) animasyonuyla tüm ekrana açılan GİB AI Akıllı Arama deneyimi.
 */
export function AiSearchModal({
  isOpen,
  onClose,
  onSelectProperty,
}: AiSearchModalProps) {
  useBodyScrollLock(isOpen);
  const vvBox = useVisualViewport(isOpen);
  const [prompt, setPrompt] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AiRecommendationItem[]>([]);

  const runAiQuery = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setSubmittedQuery(cleaned);
    setPrompt('');
    setLoading(true);
    try {
      const res = await fetchAiPropertyRecommendations(cleaned);
      setResults(res.recommendations);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-radial-overlay"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top: vvBox ? `${vvBox.top}px` : 0,
            left: 0,
            right: 0,
            height: vvBox ? `${vvBox.height}px` : '100dvh',
            zIndex: 1300,
            backgroundColor: 'var(--color-bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            overscrollBehavior: 'contain',
          }}
        >
          {/* Parıltılı Enerji Halesi Efekt Katmanı */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              right: '40px',
              bottom: '40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(168,85,247,0.55) 0%, rgba(99,102,241,0.25) 50%, transparent 75%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div
            className="ai-search-canvas"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <header className="ai-search-topbar">
              <div className="ai-search-brand">
                <Sparkles size={20} />
                <span>GİB AI Akıllı Arama</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                pill
                onClick={onClose}
                aria-label="Kapat"
              >
                <X size={20} />
              </Button>
            </header>

            <div className="ai-search-thread">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.28 }}
              >
                <div
                  style={{
                    color: 'var(--color-ai-accent)',
                    marginBottom: '8px',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <div className="ai-greeting-bubble">
                  Merhaba! Ben <strong>GİB AI</strong>. Aradığın evi kendi
                  cümlelerinle anlat, uygun ilanları senin için bulayım. Örneğin
                  şehir, semt, kiralık mı satılık mı, oda sayısı ve bütçeni
                  yazman yeterli.
                </div>
              </motion.div>

              <motion.div
                className="ai-suggestions-block"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.28 }}
              >
                <span className="ai-suggestions-title">
                  <Sparkles size={14} />
                  <span>Öneriler</span>
                </span>
                {QUICK_AI_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="ai-suggestion-pill"
                    onClick={() => void runAiQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </motion.div>

              {submittedQuery && (
                <div className="ai-user-query-bubble">{submittedQuery}</div>
              )}

              {loading && (
                <div className="ai-greeting-bubble">
                  GİB AI portföydeki ilanları kriterlerinize göre analiz
                  ediyor...
                </div>
              )}

              {!loading && submittedQuery && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                    Talebinizle eşleşen {results.length} gayrimenkul önerisi
                    bulundu:
                  </div>
                  {results.map((item) => {
                    const p = item.property;
                    const img = getPropertyGallery(p)[0];
                    return (
                      <Card
                        key={p.id}
                        variant="interactive"
                        padding="sm"
                        onClick={() => {
                          onClose();
                          onSelectProperty(p);
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '130px minmax(0, 1fr)',
                            gap: '14px',
                            alignItems: 'center',
                          }}
                        >
                          <img
                            src={img}
                            alt={p.title}
                            style={{
                              width: '130px',
                              height: '92px',
                              objectFit: 'cover',
                              borderRadius: '10px',
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 800,
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {formatPriceTL(p.price)}
                              </span>
                              <Badge variant="ai">%{item.score} Uyum</Badge>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              {p.title}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <MapPin size={12} />
                              <span>
                                {p.district} / {p.city} • {p.room_count} •{' '}
                                {p.gross_sqm} m²
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-ai-accent)',
                              }}
                            >
                              {item.explanation}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="ai-search-bottom-bar">
              <form
                className="ai-search-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAiQuery(prompt);
                }}
              >
                <input
                  type="text"
                  className="ai-search-text-input"
                  placeholder="Aradığınız evi kendi cümlelerinizle tarif edin (Örn: Çankaya'da 3+1 satılık)..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  pill
                  aria-label="Gönder"
                >
                  <CornerDownLeft size={16} />
                </Button>
              </form>
              <span className="ai-search-disclaimer">
                GİB AI akıllıdır ancak hata yapabilir, önemli ilan detaylarını
                kontrol ediniz.
              </span>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AiSearchModal;
