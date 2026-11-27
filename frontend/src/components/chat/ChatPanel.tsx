import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, RefreshCw, Send } from 'lucide-react';
import {
  fetchChatMessages,
  fetchChatThreads,
  sendChatMessage,
} from '../../api/engagement';
import { cn, toIstanbulTimeHHMM } from '../../lib/utils';
import type { ChatMessageRecord, ChatThreadRecord, UserSession } from '../../types';
import { Avatar, Badge, Button, Input } from '../core';
import '../../css/pages/Chat.css';

export interface ChatPanelProps {
  session: UserSession;
  initialThreadId?: number | null;
  onNotify?: (msg: string) => void;
}

/**
 * Alıcı ↔ Emlak Danışmanı (randevu sonrası) ve Satıcı/Kiralayan ↔ Emlak Ofisi
 * arasında doğrudan uygulama içi mesajlaşma paneli.
 */
export function ChatPanel({ session, initialThreadId, onNotify }: ChatPanelProps) {
  const isAgent = session.role === 'AGENT';
  const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(
    initialThreadId ?? null,
  );
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(
    Boolean(initialThreadId),
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialThreadId) {
      setActiveThreadId(initialThreadId);
      setMobileShowThread(true);
    }
  }, [initialThreadId]);

  const loadThreads = async () => {
    if (session.role === 'VISITOR') return;
    try {
      const res = await fetchChatThreads({
        role: isAgent ? 'AGENT' : 'CUSTOMER',
        agency_id: isAgent ? session.agency?.id ?? 1 : undefined,
        customer_id: !isAgent ? session.customer?.id : undefined,
      });
      setThreads(res.threads);
      if (res.threads.length > 0 && !activeThreadId) {
        setActiveThreadId(res.threads[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadMessages = async (tid: number) => {
    try {
      const res = await fetchChatMessages(tid);
      setMessages(res.messages);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.role, session.agency?.id, session.customer?.id]);

  useEffect(() => {
    if (!activeThreadId) return;
    void loadMessages(activeThreadId);
    const timer = window.setInterval(() => {
      void loadMessages(activeThreadId);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeThreadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeThreadId) return;
    setSending(true);
    try {
      const res = await sendChatMessage(activeThreadId, {
        sender_role: isAgent ? 'AGENT' : 'CUSTOMER',
        sender_name: session.full_name,
        sender_avatar: session.avatar_url || '',
        content,
      });
      setMessages((prev) => [...prev, res.message_item]);
      setDraft('');
      await loadThreads();
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Mesaj gönderilemedi.',
      );
    } finally {
      setSending(false);
    }
  };

  if (threads.length === 0) {
    return (
      <div
        style={{
          padding: '44px 24px',
          borderRadius: '16px',
          border: '1px dashed var(--color-border-strong)',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        <MessageSquare
          size={32}
          color="var(--color-text-muted)"
          style={{ marginBottom: '10px' }}
        />
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>
          Henüz Aktif Mesajlaşmanız Bulunmuyor
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13.5px',
            color: 'var(--color-text-muted)',
            maxWidth: '460px',
            marginInline: 'auto',
          }}
        >
          {isAgent
            ? 'Müşteriler randevu aldığında veya evini satma başvurusu gönderdiğinde sohbet kanalları otomatik olarak burada açılır.'
            : 'Alıcıysanız bir ilan üzerinden randevu oluşturduğunuzda, satıcıysanız Evini Sat başvurusu yaptığınızda danışmanınızla sohbet kanalı otomatik açılır.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('gib-chat-shell', mobileShowThread && 'is-mobile-thread')}>
      <div className="gib-chat-sidebar">
        <div className="gib-chat-sidebar-header">
          <span>Sohbetler ({threads.length})</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void loadThreads()}
            title="Sohbetleri Yenile"
          >
            <RefreshCw size={14} />
          </Button>
        </div>

        <div className="gib-chat-thread-list">
          {threads.map((th) => {
            const peerName = isAgent
              ? th.customer_name
              : th.advisor_name || th.agency_name;
            const peerAvatar = isAgent ? th.customer_avatar : th.agency_logo;

            return (
              <button
                key={th.id}
                type="button"
                className={cn(
                  'gib-chat-thread-item',
                  th.id === activeThreadId && 'is-active',
                )}
                onClick={() => {
                  setActiveThreadId(th.id);
                  setMobileShowThread(true);
                }}
              >
                <Avatar src={peerAvatar} name={peerName} size="md" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {peerName}
                    </span>
                    <Badge
                      variant={
                        th.thread_type === 'SELL_INQUIRY' ? 'warning' : 'neutral'
                      }
                    >
                      {th.thread_type === 'SELL_INQUIRY' ? 'Satıcı' : 'Randevu'}
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}
                  >
                    {th.property_title || th.subject}
                  </div>
                  {th.last_message && (
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {th.last_message}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="gib-chat-main">
        {activeThread && (
          <>
            <div className="gib-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <button
                  type="button"
                  className="gib-chat-mobile-back"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Sohbet listesine dön"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar
                  src={isAgent ? activeThread.customer_avatar : activeThread.agency_logo}
                  name={
                    isAgent
                      ? activeThread.customer_name
                      : activeThread.advisor_name || activeThread.agency_name
                  }
                  size="md"
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {isAgent
                      ? activeThread.customer_name
                      : `${activeThread.agency_name} — ${activeThread.advisor_name || 'Danışman'}`}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeThread.property_title || activeThread.subject}
                  </div>
                </div>
              </div>

              <span className="gib-chat-badge-hide-mobile">
                <Badge variant="primary">Uygulama İçi Güvenli Hat</Badge>
              </span>
            </div>

            <div className="gib-chat-messages">
              {messages.map((msg) => {
                const isMine =
                  (isAgent && msg.sender_role === 'AGENT') ||
                  (!isAgent && msg.sender_role === 'CUSTOMER');
                return (
                  <div
                    key={msg.id}
                    className={cn('gib-chat-msg-row', isMine && 'is-mine')}
                  >
                    <Avatar
                      src={msg.sender_avatar}
                      name={msg.sender_name}
                      size="sm"
                    />
                    <div className="gib-chat-bubble">
                      <div>{msg.content}</div>
                      <div className="gib-chat-meta">
                        {msg.sender_name} • {toIstanbulTimeHHMM(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form
              className="gib-chat-composer"
              onSubmit={(e) => void handleSend(e)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                pill
                disabled={sending || !draft.trim()}
                leftIcon={<Send size={14} />}
                style={{ flexShrink: 0 }}
              >
                Gönder
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
