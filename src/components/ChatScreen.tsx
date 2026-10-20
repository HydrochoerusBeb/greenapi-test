import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Chat, Credentials, IncomingText } from '../types';
import { appendOutgoing, applyIncoming, lastMessage } from '../lib/chats';
import { useCheckAccount } from '../lib/hooks/useCheckAccount';
import { useNotificationStream } from '../lib/hooks/useNotificationStream';
import { useSendMessage } from '../lib/hooks/useSendMessage';
import { readError } from '../lib/api';
import { formatPhone, normalizePhone, samePhone } from '../lib/phone';
import { loadChats, saveChats } from '../lib/session';

const MESSAGE_LIMIT = 4096;

const AVATAR_COLORS = [
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
  ['#14e1d5', '#03c722'],
  ['#ffc93d', '#ff832a'],
  ['#ff48b6', '#ff8a35'],
];

type ChatScreenProps = {
  credentials: Credentials;
  onLogout: () => void;
};

export function ChatScreen({ credentials, onLogout }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>(() => loadChats(credentials.idInstance));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<{ source: 'stream' | 'action'; text: string } | null>(null);
  const { check, isChecking } = useCheckAccount(credentials);
  const { sendMessage, isSending } = useSendMessage(credentials);
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  useEffect(() => {
    saveChats(credentials.idInstance, chats);
  }, [chats, credentials.idInstance]);

  const onText = useCallback((incoming: IncomingText) => {
    setChats((prev) => applyIncoming(prev, incoming));
  }, []);

  const onError = useCallback((message: string) => {
    setError((current) => (current?.source === 'action' ? current : { source: 'stream', text: message }));
  }, []);

  const onIdle = useCallback(() => {
    setError((current) => (current?.source === 'stream' ? null : current));
  }, []);

  useNotificationStream(credentials, { onText, onError, onIdle });

  const active = chats.find((chat) => chat.id === activeId) ?? null;

  const handleCreate = async (rawPhone: string) => {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      setError({ source: 'action', text: 'Введите номер телефона' });
      return false;
    }

    const existing = chats.find((chat) => samePhone(chat.phone, phone));
    if (existing) {
      setActiveId(existing.id);
      setError(null);
      return true;
    }

    try {
      const account = await check(phone);
      const chat: Chat = {
        id: account.chatId,
        chatId: account.chatId,
        phone,
        title: account.username.replace(/^@/, '') || formatPhone(phone),
        messages: [],
      };

      const existingNow = chatsRef.current.find(
        (item) => item.chatId === chat.chatId || samePhone(item.phone, phone),
      );

      if (existingNow) {
        setActiveId(existingNow.id);
        setError(null);
        return true;
      }

      setChats((prev) => {
        const existing = prev.find(
          (item) => item.chatId === chat.chatId || samePhone(item.phone, phone),
        );
        return existing ? prev : [chat, ...prev];
      });
      setActiveId(chat.id);
      setError(null);
      return true;
    } catch (requestError) {
      setError({ source: 'action', text: readError(requestError) });
      return false;
    }
  };

  const handleSend = async (chat: Chat, text: string) => {
    if (text.length > MESSAGE_LIMIT) {
      setError({ source: 'action', text: `Сообщение длиннее ${MESSAGE_LIMIT} символов` });
      return false;
    }

    try {
      const idMessage = await sendMessage(chat.chatId, text);
      setChats((prev) =>
        appendOutgoing(prev, chat.id, {
          id: idMessage,
          text,
          direction: 'out',
          timestamp: Date.now(),
        }),
      );
      setError(null);
      return true;
    } catch (requestError) {
      setError({ source: 'action', text: readError(requestError) });
      return false;
    }
  };

  return (
    <main className="shell" data-open={active ? 'true' : 'false'}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Чаты</h1>
          <button type="button" className="text-button" onClick={onLogout}>
            Выйти
          </button>
        </header>

        <PhoneForm isChecking={isChecking} onCreate={handleCreate} />
        {!active ? <ErrorBanner error={error} onClose={() => setError(null)} /> : null}

        {chats.length === 0 ? (
          <p className="empty-list">Создайте чат по номеру телефона</p>
        ) : (
          <ul className="chat-list">
            {chats.map((chat) => {
              const latest = lastMessage(chat);

              return (
                <li key={chat.id}>
                  <button
                    type="button"
                    className={chat.id === activeId ? 'chat-row is-active' : 'chat-row'}
                    onClick={() => setActiveId(chat.id)}
                  >
                    <Avatar chat={chat} />
                    <span className="chat-row-text">
                      <span className="chat-row-title">{chat.title}</span>
                      <span className="chat-row-preview">{latest?.text ?? 'Нет сообщений'}</span>
                    </span>
                    <time>{formatTime(latest?.timestamp)}</time>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="thread">
        {active ? (
          <Conversation
            chat={active}
            error={error}
            isSending={isSending}
            onBack={() => setActiveId(null)}
            onCloseError={() => setError(null)}
            onSend={(text) => handleSend(active, text)}
          />
        ) : (
          <div className="thread-placeholder">
            <p>Выберите чат</p>
          </div>
        )}
      </section>
    </main>
  );
}

function ErrorBanner({
  error,
  onClose,
}: {
  error: { text: string } | null;
  onClose: () => void;
}) {
  if (!error) return null;

  return (
    <div className="banner" role="alert">
      <span>{error.text}</span>
      <button type="button" onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}

type PhoneFormProps = {
  isChecking: boolean;
  onCreate: (phone: string) => Promise<boolean>;
};

function PhoneForm({ isChecking, onCreate }: PhoneFormProps) {
  const [phone, setPhone] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onCreate(phone).then((created) => {
      if (created) setPhone('');
    });
  };

  return (
    <form className="new-chat" onSubmit={handleSubmit}>
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Номер телефона"
        inputMode="tel"
        aria-label="Номер телефона"
      />
      <button type="submit" disabled={isChecking || phone.trim() === ''}>
        {isChecking ? 'Проверка' : 'Создать'}
      </button>
    </form>
  );
}

type ConversationProps = {
  chat: Chat;
  error: { text: string } | null;
  isSending: boolean;
  onBack: () => void;
  onCloseError: () => void;
  onSend: (text: string) => Promise<boolean>;
};

function Conversation({ chat, error, isSending, onBack, onCloseError, onSend }: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = [...chat.messages].sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.id, messages.length]);

  return (
    <>
      <header className="thread-header">
        <button type="button" className="back-button" onClick={onBack}>
          Назад
        </button>
        <Avatar chat={chat} />
        <span>
          <strong>{chat.title}</strong>
          <small>{formatPhone(chat.phone) || chat.chatId}</small>
        </span>
      </header>
      <ErrorBanner error={error} onClose={onCloseError} />
      <div className="messages">
        {messages.map((message) => (
          <article key={message.id} className={`bubble ${message.direction}`}>
            <p>{message.text}</p>
            <time>{formatTime(message.timestamp)}</time>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <Composer isSending={isSending} onSend={onSend} />
    </>
  );
}

type ComposerProps = {
  isSending: boolean;
  onSend: (text: string) => Promise<boolean>;
};

function Composer({ isSending, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const submit = async () => {
    if (!trimmed || isSending) return;

    const sent = await onSend(trimmed);
    if (sent) setText('');
  };

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Сообщение"
        rows={1}
        maxLength={MESSAGE_LIMIT}
        aria-label="Сообщение"
      />
      <button type="submit" disabled={!trimmed || isSending} aria-label="Отправить">
        <SendIcon />
      </button>
    </form>
  );
}

function Avatar({ chat }: { chat: Chat }) {
  const index = [...chat.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const [from, to] = AVATAR_COLORS[index];
  const digits = chat.phone.replace(/\D/g, '');
  const label = digits.length >= 2 ? digits.slice(-2) : chat.title.slice(0, 1).toUpperCase();

  return (
    <span className="avatar" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
      {label}
    </span>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12 19 5l-6.2 14-2.3-6.2L4 12Z" />
    </svg>
  );
}

function formatTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
