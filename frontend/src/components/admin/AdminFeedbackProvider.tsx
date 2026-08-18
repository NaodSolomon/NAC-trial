'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type FeedbackTone = 'success' | 'error' | 'info';

interface FeedbackInput {
  title: string;
  message?: string;
  tone?: FeedbackTone;
}

interface FeedbackMessage extends FeedbackInput {
  id: number;
  tone: FeedbackTone;
}

interface AdminFeedbackContextValue {
  notify: (feedback: FeedbackInput) => void;
  dismiss: (id: number) => void;
}

const AdminFeedbackContext = createContext<AdminFeedbackContextValue | null>(null);

export function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const nextId = useRef(1);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);
  const notify = useCallback(
    (input: FeedbackInput) => {
      const id = nextId.current++;
      setMessages((current) => [
        ...current.slice(-2),
        { ...input, id, tone: input.tone ?? 'success' },
      ]);
      window.setTimeout(() => dismiss(id), 6_000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <AdminFeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {messages.map((message) => (
          <FeedbackNotice key={message.id} message={message} onDismiss={dismiss} />
        ))}
      </div>
    </AdminFeedbackContext.Provider>
  );
}

export function useAdminFeedback(): AdminFeedbackContextValue {
  const context = useContext(AdminFeedbackContext);
  if (!context) throw new Error('useAdminFeedback must be used inside AdminFeedbackProvider');
  return context;
}

function FeedbackNotice({
  message,
  onDismiss,
}: {
  message: FeedbackMessage;
  onDismiss: (id: number) => void;
}) {
  const Icon =
    message.tone === 'success' ? CheckCircle2 : message.tone === 'error' ? CircleAlert : Info;
  const colors =
    message.tone === 'success'
      ? 'border-green-300 text-green-950'
      : message.tone === 'error'
        ? 'border-red-300 text-red-950'
        : 'border-blue-300 text-blue-950';
  return (
    <section
      role={message.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${colors}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{message.title}</h2>
        {message.message && <p className="mt-1 text-sm">{message.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(message.id)}
        className="min-h-11 min-w-11 rounded-md p-2"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  );
}
