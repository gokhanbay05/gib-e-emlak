import React, { useState } from 'react';
import { CornerDownLeft, MapPin, Sparkles, X } from 'lucide-react';
import {
  fetchAiPropertyRecommendations,
  type AiRecommendationItem,
} from '../../api/properties';
import type { PropertyRecord } from '../../types';
import { formatPriceTL, getPropertyGallery } from '../../lib/utils';
import { Badge, Button, Card, Modal } from '../core';
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
 * Hepsiemlak Screenshot #3 tarzı tam ekran "GİB AI Akıllı Arama" deneyimi.
 */
export function AiSearchModal({
  isOpen,
  onClose,
  onSelectProperty,
}: AiSearchModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="fullscreen">
      <div className="ai-search-canvas">
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
          <div>
            <div style={{ color: 'var(--color-ai-accent)', marginBottom: '8px' }}>
              <Sparkles size={22} />
            </div>
            <div className="ai-greeting-bubble">
              Merhaba! Ben <strong>GİB AI</strong>. Aradığın evi kendi
              cümlelerinle anlat, uygun ilanları senin için bulayım. Örneğin
              şehir, semt, kiralık mı satılık mı, oda sayısı ve bütçeni yazman
              yeterli.
            </div>
          </div>

          <div className="ai-suggestions-block">
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
          </div>

          {submittedQuery && (
            <div className="ai-user-query-bubble">{submittedQuery}</div>
          )}

          {loading && (
            <div className="ai-greeting-bubble">
              GİB AI portföydeki ilanları kriterlerinize göre analiz ediyor...
            </div>
          )}

          {!loading && submittedQuery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                Talebinizle eşleşen {results.length} gayrimenkul önerisi bulundu:
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                            {p.district} / {p.city} • {p.room_count} • {p.gross_sqm} m²
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-ai-accent)' }}>
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
            GİB AI akıllıdır ancak hata yapabilir, önemli ilan detaylarını kontrol ediniz.
          </span>
        </footer>
      </div>
    </Modal>
  );
}

export default AiSearchModal;
